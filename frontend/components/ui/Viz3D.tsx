/* 3D visual primitives — Donut3D, IsoBar, RibbonArea — exactly per the handoff. */

interface Segment { value: number; color: string; label?: string }

export function Donut3D({
  segments, size = 220, hole = 0.52, layers = 14, tilt = 62, rotate = -18,
}: { segments: Segment[]; size?: number; hole?: number; layers?: number; tilt?: number; rotate?: number }) {
  const total = segments.reduce((s, x) => s + x.value, 0) || 1;
  let acc = 0;
  const stops = segments.map((s) => {
    const start = (acc / total) * 360;
    acc += s.value;
    const end = (acc / total) * 360;
    return `${s.color} ${start}deg ${end}deg`;
  }).join(", ");
  const conic = `conic-gradient(from 0deg, ${stops})`;
  const holePct = (hole * 100).toFixed(1);
  const mask = `radial-gradient(circle, transparent ${holePct}%, black ${parseFloat(holePct) + 0.5}%)`;

  return (
    <div className="donut3d-wrap" style={{ width: size, height: size }}>
      <div className="donut3d-tilt" style={{ transform: `rotateX(${tilt}deg) rotateZ(${rotate}deg)` }}>
        {Array.from({ length: layers }).map((_, i) => (
          <div
            key={i}
            className="donut3d-layer"
            style={{
              background: conic,
              WebkitMaskImage: mask,
              maskImage: mask,
              transform: `translateZ(${(i - layers) * 1.8}px)`,
              filter: `brightness(${0.42 + (i / layers) * 0.6})`,
            }}
          />
        ))}
        <div
          className="donut3d-gloss"
          style={{ WebkitMaskImage: mask, maskImage: mask }}
        />
      </div>
    </div>
  );
}

export function IsoBar({
  value, max = 1, color = "var(--accent)", height = 14,
}: { value: number; max?: number; color?: string; height?: number }) {
  const pct = Math.max(0, Math.min(100, (value / max) * 100));
  const top  = `oklch(from ${color} calc(l + 0.10) c h)`;
  const side = `oklch(from ${color} calc(l - 0.10) c h)`;
  return (
    <span className="isobar" style={{ height }}>
      <span className="isobar-bar" style={{ width: pct + "%", background: color }}>
        <span className="isobar-top"  style={{ background: top  }} />
        <span className="isobar-side" style={{ background: side }} />
      </span>
    </span>
  );
}

interface RibbonAreaProps {
  data: { val: number }[];
  width?: number;
  height?: number;
  color?: string;
  depth?: number;
  labels?: (string | number)[];
  max?: number;
}

export function RibbonArea({
  data, width = 600, height = 220, color = "var(--accent)", depth = 14, labels, max,
}: RibbonAreaProps) {
  if (!data?.length) return null;
  const padX = 24, padTop = 16, padBot = 32;
  const w = width - padX * 2, h = height - padTop - padBot;
  const maxV = max ?? Math.max(...data.map((d) => d.val));
  const range = maxV - 0 || 1;
  const xs = data.map((_, i) => padX + (i / (data.length - 1)) * w);
  const ys = data.map((d) => padTop + h - ((d.val - 0) / range) * h);
  const linePts = xs.map((x, i) => `${x.toFixed(1)},${ys[i].toFixed(1)}`).join(" ");
  const areaPts = `${padX},${padTop + h} ${linePts} ${padX + w},${padTop + h}`;
  const sideQuads = xs.slice(0, -1).map((x, i) => {
    const x2 = xs[i + 1];
    const y1 = ys[i], y2 = ys[i + 1];
    return `${x},${y1} ${x2},${y2} ${(x2 + depth * 0.6)},${y2 + depth} ${(x + depth * 0.6)},${y1 + depth}`;
  });
  return (
    <svg className="ribbon" viewBox={`0 0 ${width} ${height}`} width="100%" height={height} preserveAspectRatio="none">
      <defs>
        <linearGradient id="ribbonTop" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%"   stopColor={color} stopOpacity="0.30" />
          <stop offset="100%" stopColor={color} stopOpacity="0.05" />
        </linearGradient>
        <linearGradient id="ribbonSide" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%"   stopColor={color} stopOpacity="0.70" />
          <stop offset="100%" stopColor={color} stopOpacity="0.40" />
        </linearGradient>
      </defs>
      {[0.25, 0.5, 0.75, 1.0].map((p) => (
        <line key={p}
          x1={padX} x2={padX + w}
          y1={padTop + h - p * h} y2={padTop + h - p * h}
          stroke="var(--line-2)" strokeWidth="0.6" strokeDasharray="2 4"
        />
      ))}
      {sideQuads.map((pts, i) => (
        <polygon key={i} points={pts} fill="url(#ribbonSide)" stroke="none" />
      ))}
      <polygon points={areaPts} fill="url(#ribbonTop)" stroke="none" />
      <polyline points={linePts} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      {xs.map((x, i) => (
        <circle key={i} cx={x} cy={ys[i]} r="3.2" fill="var(--surface)" stroke={color} strokeWidth="1.6" />
      ))}
      {labels?.map((l, i) => (
        <text key={i} x={xs[i]} y={padTop + h + 18}
          fill="var(--ink-3)" fontSize="10.5" fontFamily="var(--font-mono)" textAnchor="middle">
          {l}
        </text>
      ))}
    </svg>
  );
}
