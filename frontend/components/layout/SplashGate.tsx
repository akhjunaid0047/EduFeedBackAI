"use client";

import { useEffect, useState } from "react";

const SESSION_KEY = "efai-splash-shown";
// Letter pulse staggers at 95ms per character, animation cycle is 2.4s.
// "EduFeedback AI." has 14 visible chars; last letter finishes its first
// pulse at ~3.65s. Pad to 3.9s so the full wave reads end-to-end.
const DURATION_MS = 3900;

/** The animated boot splash — character-pulsed wordmark from the design handoff. */
function SplashScreen() {
  const parts = [
    { text: "EduFeedback", cls: "" },
    { text: " ",           cls: "is-space" },
    { text: "AI.",         cls: "is-ai" },
  ];
  let charIdx = 0;
  return (
    <div className="splash-v2">
      <div className="splash-v2-grid" aria-hidden="true" />
      <div className="splash-v2-inner">
        <div className="splash-v2-banner">
          <span><b>Techno India University</b></span>
          <span className="splash-v2-banner-rule">·</span>
          <span>School of Engineering</span>
          <span className="splash-v2-banner-rule">·</span>
          <span>Curriculum Intelligence</span>
        </div>

        <h1 className="splash-wordmark">
          {parts.map((p, pi) => (
            <span key={pi} className={`splash-part ${p.cls}`}>
              {p.text.split("").map((ch, ci) => {
                const i = charIdx++;
                if (ch === " ") {
                  return (
                    <span key={ci} className="splash-letter is-space" style={{ ["--i" as any]: i }}>
                      &nbsp;
                    </span>
                  );
                }
                return (
                  <span key={ci} className="splash-letter" style={{ ["--i" as any]: i }}>
                    {ch}
                  </span>
                );
              })}
            </span>
          ))}
        </h1>

        <div className="splash-v2-foot">
          <span className="splash-v2-rule" />
          <span className="mono splash-v2-status">Loading workspace</span>
          <span className="splash-dots">
            <span /><span /><span />
          </span>
          <span className="splash-v2-rule" />
        </div>
      </div>
    </div>
  );
}

/**
 * Plays the splash on first paint of every fresh browser session, regardless of
 * which URL the user landed on. Subsequent in-app navigations skip it.
 * Uses sessionStorage so it replays after a tab close, but not on every nav.
 */
export function SplashGate({ children }: { children: React.ReactNode }) {
  // Render splash on the very first paint to avoid a flash of content.
  // We don't read sessionStorage here because it's not available during SSR;
  // we'll hide the splash immediately in useEffect if the session flag is set.
  const [phase, setPhase] = useState<"splash" | "ready">("splash");

  useEffect(() => {
    let cancelled = false;
    try {
      if (sessionStorage.getItem(SESSION_KEY) === "1") {
        setPhase("ready");
        return;
      }
    } catch {
      // sessionStorage can throw in private modes — fall through and play splash.
    }
    const t = setTimeout(() => {
      if (cancelled) return;
      try { sessionStorage.setItem(SESSION_KEY, "1"); } catch {}
      setPhase("ready");
    }, DURATION_MS);
    return () => { cancelled = true; clearTimeout(t); };
  }, []);

  if (phase === "splash") return <SplashScreen />;
  return <>{children}</>;
}
