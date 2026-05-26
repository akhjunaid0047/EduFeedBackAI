import { ReactNode } from "react";
import { Badge } from "./Badge";

interface StatProps {
  eyebrow: string;
  value: string | number;
  suffix?: string;
  delta?: string;
  deltaTone?: "ok" | "green" | "warn" | "orange" | "danger" | "red" | "blue" | "info" | "gray";
  chart?: ReactNode;
  footer?: ReactNode;
}

/** KPI tile — 3D paper feel, headline value + chart + dashed footer */
export function Stat({ eyebrow, value, suffix, delta, deltaTone = "ok", chart, footer }: StatProps) {
  return (
    <div className="stat">
      <div className="stat-head">
        <span className="stat-eyebrow">{eyebrow}</span>
        {delta && <Badge tone={deltaTone as any} size="sm">{delta}</Badge>}
      </div>
      <div className="stat-value-row">
        <span className="stat-value serif">
          {value}
          {suffix && <span className="stat-suffix">{suffix}</span>}
        </span>
        {chart && <div className="stat-chart">{chart}</div>}
      </div>
      {footer && <div className="stat-foot">{footer}</div>}
    </div>
  );
}

/** Tiny SVG polyline for KPI sparklines. */
export function Sparkline({ data, color = "var(--accent)" }: { data: number[]; color?: string }) {
  if (!data.length) return null;
  const w = 100, h = 28;
  const max = Math.max(...data), min = Math.min(...data);
  const range = max - min || 1;
  const pts = data
    .map((v, i) => {
      const x = (i / (data.length - 1)) * w;
      const y = h - ((v - min) / range) * h;
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ");
  return (
    <svg className="spark" viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none" width="100%" height="100%">
      <polyline points={pts} fill="none" stroke={color} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

/** Mini bars — used inside Stat. */
export function MiniBars({ data, color = "var(--ink)" }: { data: number[]; color?: string }) {
  return (
    <div className="minibars">
      {data.map((v, i) => (
        <span key={i} className="minibar" style={{ height: `${Math.max(8, v * 100)}%`, background: color }} />
      ))}
    </div>
  );
}

/** Horizontal progress bar. */
export function ProgressBar({ value, tone = "var(--accent)", height = 6 }: { value: number; tone?: string; height?: number }) {
  const pct = Math.max(0, Math.min(1, value)) * 100;
  return (
    <span className="pbar" style={{ height }}>
      <span className="pbar-fill" style={{ width: `${pct}%`, background: tone }} />
    </span>
  );
}

export function tierColor(score: number) {
  if (score >= 0.7) return "var(--ok)";
  if (score >= 0.5) return "var(--warn)";
  return "var(--danger)";
}
