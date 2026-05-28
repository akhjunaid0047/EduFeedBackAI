"""
LLM-based domain-fit filter for curriculum ADD recommendations.

Problem: the BERT gap engine flags "git" as an ADD for an Operating Systems
course because many alumni mention git AND the OS syllabus doesn't cover it.
Low similarity is interpreted as "missing", but here it actually means
"different academic domain."

This module asks an LLM to filter out ADD candidates that don't belong to the
course's academic domain. REDUCE and OVERHAUL recommendations are passed
through unchanged — their rules don't suffer from the same domain confusion.

Provider switch: set LLM_PROVIDER=openai (default, active) or anthropic
(currently kept for future use; the code path exists but is only taken when
the env var is set explicitly).

Caching: successful filter results are cached in Redis (key includes course
code, syllabus outline hash, and sorted candidate list) for 7 days. This
eliminates duplicate LLM spend across re-runs when the same course/candidate
combination appears. Bumps to CACHE_VERSION invalidate the cache.
"""
import hashlib
import json
import logging
from typing import Optional

from app.core.config import settings

logger = logging.getLogger(__name__)

_MAX_TOPICS_PER_UNIT = 8  # cap to keep prompts short and predictable

# Bump when SYSTEM_PROMPT or the underlying model semantics change in a way
# that would make older cached results invalid.
CACHE_VERSION = "v1"
CACHE_TTL_SECONDS = 7 * 24 * 3600

_redis_client = None


def _get_redis():
    """Lazy singleton. Returns None if Redis is unreachable so callers fail open."""
    global _redis_client
    if _redis_client is False:  # sentinel: previously failed to connect
        return None
    if _redis_client is None:
        try:
            import redis
            client = redis.Redis.from_url(
                settings.REDIS_URL,
                decode_responses=True,
                socket_connect_timeout=2,
                socket_timeout=2,
            )
            client.ping()
            _redis_client = client
        except Exception:
            logger.warning("Domain filter cache: Redis unreachable, running without cache")
            _redis_client = False
            return None
    return _redis_client


def _cache_key(course_code: str, syllabus_outline: str, candidate_names: list[str]) -> str:
    payload = syllabus_outline + "||" + "|".join(sorted(c.lower() for c in candidate_names))
    digest = hashlib.md5(payload.encode("utf-8")).hexdigest()
    return f"domain_filter:{CACHE_VERSION}:{course_code}:{digest}"

SYSTEM_PROMPT = (
    "You are a curriculum design assistant. Given a course syllabus and a list "
    "of candidate skills proposed to be added to that syllabus, decide which "
    "candidates actually belong to the course's academic domain.\n\n"
    "A skill BELONGS if it is a topic an instructor of this course could "
    "reasonably teach without changing the course's identity. A skill DOES NOT "
    "BELONG if it comes from a different academic domain (for example, 'git' "
    "does not belong in an Operating Systems course, even though many "
    "programmers use git in their jobs).\n\n"
    'Respond with JSON ONLY in this exact shape:\n'
    '{"keep": ["skill1", "skill2"], '
    '"rejected": [{"skill": "skill3"}]}\n'
    "Use the skill strings exactly as they appear in the candidate list."
)

USER_TEMPLATE = (
    "Course: {course_code} — {course_name}\n\n"
    "Syllabus outline:\n{syllabus_outline}\n\n"
    "Candidate skills to consider adding:\n{candidate_list}\n\n"
    "Return the JSON described in the system prompt."
)


def filter_by_domain(
    course_code: str,
    course_name: str,
    syllabus_structure: dict,
    recommendations: list[dict],
    provider: Optional[str] = None,
) -> list[dict]:
    """
    Filter ADD recommendations to only those that fit the course's domain.
    REDUCE / OVERHAUL recommendations pass through unchanged.

    Fails open: if the LLM call errors or the response can't be parsed,
    returns the original list so a flaky API doesn't silently drop
    recommendations.
    """
    if not recommendations:
        return recommendations

    add_candidates = [
        r for r in recommendations if r.get("recommendation_type") == "ADD"
    ]
    if not add_candidates:
        return recommendations

    provider_name = (provider or settings.LLM_PROVIDER or "openai").lower()

    syllabus_outline = _format_syllabus_outline(syllabus_structure)
    candidate_names = [c["target_topic"] for c in add_candidates]
    candidate_list = "\n".join(f"- {c}" for c in candidate_names)
    user_prompt = USER_TEMPLATE.format(
        course_code=course_code,
        course_name=course_name or "",
        syllabus_outline=syllabus_outline,
        candidate_list=candidate_list,
    )

    # Cache lookup — same course+syllabus+candidates → cached LLM result.
    cache_key = _cache_key(course_code, syllabus_outline, candidate_names)
    redis_client = _get_redis()
    kept: Optional[list[str]] = None
    cache_hit = False
    if redis_client is not None:
        try:
            cached = redis_client.get(cache_key)
            if cached:
                kept = json.loads(cached)
                cache_hit = True
        except Exception:
            logger.warning("Domain filter cache read failed for course %s", course_code)

    if kept is None:
        try:
            if provider_name == "openai":
                kept = _filter_with_openai(SYSTEM_PROMPT, user_prompt)
            elif provider_name == "anthropic":
                kept = _filter_with_anthropic(SYSTEM_PROMPT, user_prompt)
            else:
                logger.warning(
                    "Unknown LLM_PROVIDER=%r, skipping domain filter for course %s",
                    provider_name, course_code,
                )
                return recommendations
        except Exception:
            logger.exception(
                "Domain filter LLM call failed for course %s; keeping all candidates",
                course_code,
            )
            return recommendations

        # Cache successful result. Never cache on failure path above.
        if redis_client is not None:
            try:
                redis_client.setex(cache_key, CACHE_TTL_SECONDS, json.dumps(kept))
            except Exception:
                logger.warning("Domain filter cache write failed for course %s", course_code)

    kept_lower = {s.strip().lower() for s in kept}
    filtered: list[dict] = []
    rejected_count = 0
    for rec in recommendations:
        if rec.get("recommendation_type") != "ADD":
            filtered.append(rec)
        elif rec["target_topic"].strip().lower() in kept_lower:
            filtered.append(rec)
        else:
            rejected_count += 1
            logger.info(
                "Domain filter rejected: course=%s skill=%r",
                course_code, rec["target_topic"],
            )

    logger.info(
        "Domain filter [%s%s] course=%s: %d ADD → %d kept (%d rejected)",
        provider_name, " cached" if cache_hit else "",
        course_code,
        len(add_candidates), len(add_candidates) - rejected_count, rejected_count,
    )
    return filtered


def _format_syllabus_outline(structure: dict) -> str:
    lines: list[str] = []
    for unit in structure.get("units", []):
        lines.append(f"- {unit.get('title', '(untitled unit)')}")
        for topic in unit.get("topics", [])[:_MAX_TOPICS_PER_UNIT]:
            lines.append(f"    - {topic}")
    return "\n".join(lines) if lines else "(no parsed units)"


# ---------- OpenAI (active) ----------

def _filter_with_openai(system_prompt: str, user_prompt: str) -> list[str]:
    from openai import OpenAI

    api_key = settings.OPENAI_API_KEY
    if not api_key:
        raise RuntimeError("OPENAI_API_KEY is not configured")

    client = OpenAI(api_key=api_key)
    resp = client.chat.completions.create(
        model=settings.LLM_OPENAI_MODEL,
        messages=[
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_prompt},
        ],
        response_format={"type": "json_object"},
        temperature=0,
    )
    content = resp.choices[0].message.content or "{}"
    data = json.loads(content)
    return list(data.get("keep", []))


# ---------- Anthropic (fallback; inactive unless LLM_PROVIDER=anthropic) ----------

def _filter_with_anthropic(system_prompt: str, user_prompt: str) -> list[str]:
    from anthropic import Anthropic

    api_key = settings.ANTHROPIC_API_KEY
    if not api_key:
        raise RuntimeError("ANTHROPIC_API_KEY is not configured")

    client = Anthropic(api_key=api_key)
    resp = client.messages.create(
        model=settings.LLM_ANTHROPIC_MODEL,
        max_tokens=1024,
        system=system_prompt,
        messages=[{"role": "user", "content": user_prompt}],
    )
    text = "".join(block.text for block in resp.content if getattr(block, "type", "") == "text")
    data = json.loads(text.strip())
    return list(data.get("keep", []))
