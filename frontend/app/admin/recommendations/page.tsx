"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import api from "@/lib/api";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { ProgressBar } from "@/components/ui/Stat";
import { Info, Check, X, History, Filter, ChevronDown } from "lucide-react";

type FilterValue = "pending" | "accepted" | "rejected" | "deferred" | "all";

const typeMeta: Record<string, { tone: "green" | "orange" | "blue" | "gray" | "purple"; label: string }> = {
  ADD:      { tone: "green",  label: "ADD" },
  REDUCE:   { tone: "orange", label: "REDUCE" },
  MODIFY:   { tone: "blue",   label: "MODIFY" },
  REVIEW:   { tone: "gray",   label: "REVIEW" },
  OVERHAUL: { tone: "purple", label: "OVERHAUL" },
};

type Rec = {
  id: string;
  course_id: string;
  course_code?: string;
  course_name?: string;
  recommendation_type: string;
  target_topic: string;
  evidence_summary?: string;
  priority_score?: number;
  status: string;
};

type Group = {
  course_id: string;
  course_code: string;
  course_name?: string;
  recs: Rec[];
  hasOverhaul: boolean;
  maxPriority: number;
};

function groupByCourse(items: Rec[]): Group[] {
  const map = new Map<string, Group>();
  for (const r of items) {
    const key = r.course_code || r.course_id;
    let g = map.get(key);
    if (!g) {
      g = {
        course_id: r.course_id,
        course_code: r.course_code || r.course_id.slice(0, 12),
        course_name: r.course_name,
        recs: [],
        hasOverhaul: false,
        maxPriority: 0,
      };
      map.set(key, g);
    }
    g.recs.push(r);
    if (r.recommendation_type === "OVERHAUL") g.hasOverhaul = true;
    g.maxPriority = Math.max(g.maxPriority, r.priority_score || 0);
  }
  // Sort each group's recs by priority desc (the API also does this, but
  // we sort defensively in case the API order changes).
  for (const g of map.values()) {
    g.recs.sort((a, b) => (b.priority_score || 0) - (a.priority_score || 0));
  }
  // Courses with OVERHAUL go first (structural attention needed), then by
  // max priority within group, then by course code.
  return Array.from(map.values()).sort((a, b) => {
    if (a.hasOverhaul !== b.hasOverhaul) return a.hasOverhaul ? -1 : 1;
    if (a.maxPriority !== b.maxPriority) return b.maxPriority - a.maxPriority;
    return a.course_code.localeCompare(b.course_code);
  });
}

export default function RecommendationsPage() {
  const queryClient = useQueryClient();
  const [filter, setFilter] = useState<FilterValue>("pending");

  const { data: recs, isLoading } = useQuery({
    queryKey: ["recommendations"],
    queryFn: () => api.get("/api/v1/analytics/recommendations").then((r) => r.data),
  });

  const mutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) =>
      api.patch(`/api/v1/analytics/recommendations/${id}`, { status }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["recommendations"] }),
  });

  if (isLoading) return <div className="page page-wide"><LoadingSpinner /></div>;

  const items = (recs || []) as Rec[];
  const counts = {
    pending:  items.filter((r) => r.status === "PENDING").length,
    accepted: items.filter((r) => r.status === "ACCEPTED").length,
    rejected: items.filter((r) => r.status === "REJECTED").length,
    deferred: items.filter((r) => r.status === "DEFERRED").length,
  };
  const filtered = filter === "all"
    ? items
    : items.filter((r) => r.status === filter.toUpperCase());

  const groups = groupByCourse(filtered);

  return (
    <div className="page page-wide">
      <div className="page-head">
        <div>
          <span className="eyebrow">Curriculum · recommendations</span>
          <h1 className="serif">{counts.pending} changes the AI is asking you to accept.</h1>
          <p className="lede">
            Each one is rooted in a piece of evidence — what alumni mentioned versus what
            the syllabus currently covers. Accept, reject, or defer. Your call carries.
          </p>
        </div>
        <div className="actions">
          <Button variant="ghost" icon={<Filter size={14} />}>Filter</Button>
          <Button variant="ghost">Bulk accept high-priority</Button>
        </div>
      </div>

      <div className="tabs">
        {([
          { v: "pending",  label: "Pending",  c: counts.pending },
          { v: "accepted", label: "Accepted", c: counts.accepted },
          { v: "rejected", label: "Rejected", c: counts.rejected },
          { v: "deferred", label: "Deferred", c: counts.deferred },
          { v: "all",      label: "All",      c: undefined as number | undefined },
        ] as const).map((t) => (
          <button
            key={t.v}
            className={`tab ${filter === t.v ? "is-active" : ""}`}
            onClick={() => setFilter(t.v as FilterValue)}
          >
            {t.label}
            {t.c != null && <span className="tab-count">{t.c}</span>}
          </button>
        ))}
      </div>

      {groups.length === 0 ? (
        <Empty />
      ) : (
        <div className="rec-groups">
          {groups.map((g) => (
            <CourseGroup
              key={g.course_id}
              group={g}
              onDecide={(id, status) => mutation.mutate({ id, status })}
              pending={mutation.isPending}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function Empty() {
  return (
    <div className="empty">
      <div className="empty-icon"><Check size={20} /></div>
      <h4>Nothing in this bucket.</h4>
      <p>Pending, accepted, rejected, and deferred recommendations live here. Run analytics to generate new ones.</p>
    </div>
  );
}

function CourseGroup({
  group,
  onDecide,
  pending,
}: {
  group: Group;
  onDecide: (id: string, status: string) => void;
  pending: boolean;
}) {
  const [open, setOpen] = useState(false);
  const typeCounts = group.recs.reduce(
    (acc, r) => {
      acc[r.recommendation_type] = (acc[r.recommendation_type] || 0) + 1;
      return acc;
    },
    {} as Record<string, number>,
  );

  return (
    <section className={`rec-course-group ${group.hasOverhaul ? "is-overhaul" : ""}`}>
      <header className="rec-course-header" onClick={() => setOpen((o) => !o)}>
        <div className="rec-course-title">
          <span className="mono rec-course-code">{group.course_code}</span>
          {group.course_name && <span className="rec-course-name">{group.course_name}</span>}
        </div>
        <div className="rec-course-meta">
          {Object.entries(typeCounts).map(([type, n]) => {
            const t = typeMeta[type] || { tone: "gray", label: type };
            return (
              <Badge key={type} tone={t.tone} size="sm">
                {n} {t.label.toLowerCase()}
              </Badge>
            );
          })}
          <ChevronDown
            size={16}
            className={`rec-course-chevron ${open ? "is-open" : ""}`}
            aria-hidden
          />
        </div>
      </header>

      {open && (
        <div className="rec-list">
          {group.recs.map((r) => (
            <RecCard
              key={r.id}
              r={r}
              onDecide={(status) => onDecide(r.id, status)}
              pending={pending}
            />
          ))}
        </div>
      )}
    </section>
  );
}

function RecCard({ r, onDecide, pending }: { r: Rec; onDecide: (status: string) => void; pending: boolean }) {
  const t = typeMeta[r.recommendation_type] || { tone: "gray" as const, label: r.recommendation_type };
  const statusBadge =
    r.status === "PENDING"  ? <Badge tone="orange" dot>Pending review</Badge> :
    r.status === "ACCEPTED" ? <Badge tone="green">Accepted</Badge> :
    r.status === "REJECTED" ? <Badge tone="red">Rejected</Badge> :
                              <Badge tone="gray">Deferred</Badge>;
  const high = (r.priority_score || 0) >= 0.8;
  const isOverhaul = r.recommendation_type === "OVERHAUL";

  return (
    <article className={`rec-card ${high ? "is-high" : ""} ${isOverhaul ? "is-overhaul" : ""}`}>
      <div className="rec-card-stack" />
      <div className="rec-card-stack rec-card-stack-2" />
      <div className="rec-card-inner">
        <header className="rec-head">
          <Badge tone={t.tone} size="md">{t.label}</Badge>
          <span className="rec-unit">· proposed</span>
          {statusBadge}
        </header>

        <h3 className="rec-topic serif">{r.target_topic}</h3>

        {isOverhaul && (
          <p className="rec-overhaul-note">
            <Info size={13} style={{ verticalAlign: "-2px" }} />{" "}
            <strong>What this means:</strong> the AI isn&apos;t proposing a specific topic
            change. The course as a whole ranks in the bottom of all courses for
            alumni-relevance — accepting this flags it for a committee-level redesign
            rather than topic-by-topic patches.
          </p>
        )}

        <p className="rec-evidence">
          <Info size={13} style={{ verticalAlign: "-2px", color: "var(--ink-3)" }} />{" "}
          {r.evidence_summary}
        </p>

        <div className="rec-foot">
          <div className="rec-priority">
            <span className="eyebrow mono">priority</span>
            <ProgressBar
              value={r.priority_score || 0}
              tone={high ? "var(--accent)" : (r.priority_score || 0) >= 0.5 ? "var(--warn)" : "var(--ink-3)"}
              height={5}
            />
            <span className="mono rec-priority-num">{(r.priority_score || 0).toFixed(2)}</span>
          </div>

          {r.status === "PENDING" ? (
            <div className="rec-actions">
              <Button size="sm" variant="ghost" loading={pending} onClick={() => onDecide("DEFERRED")} icon={<History size={13} />}>
                Defer
              </Button>
              <Button size="sm" variant="ghost" loading={pending} onClick={() => onDecide("REJECTED")} icon={<X size={13} />}>
                Reject
              </Button>
              <Button size="sm" loading={pending} onClick={() => onDecide("ACCEPTED")} icon={<Check size={13} />}>
                Accept
              </Button>
            </div>
          ) : (
            <span className="mono rec-decided">
              decided · {r.status?.toLowerCase()}
            </span>
          )}
        </div>
      </div>
    </article>
  );
}
