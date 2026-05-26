import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./lib/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Surfaces
        paper:    "var(--paper)",
        "paper-2":"var(--paper-2)",
        "paper-3":"var(--paper-3)",
        surface:  "var(--surface)",
        "surface-2":"var(--surface-2)",
        // Ink
        ink:     "var(--ink)",
        "ink-2": "var(--ink-2)",
        "ink-3": "var(--ink-3)",
        muted:   "var(--muted)",
        faint:   "var(--faint)",
        // Lines
        line:    "var(--line)",
        "line-2":"var(--line-2)",
        "line-3":"var(--line-3)",
        // Accent (oxblood)
        accent:        "var(--accent)",
        "accent-hover":"var(--accent-hover)",
        "accent-soft": "var(--accent-soft)",
        "accent-line": "var(--accent-line)",
        "accent-ink":  "var(--accent-ink)",
        // Status
        ok:        "var(--ok)",        "ok-soft":   "var(--ok-soft)",   "ok-line":   "var(--ok-line)",
        warn:      "var(--warn)",      "warn-soft": "var(--warn-soft)", "warn-line": "var(--warn-line)",
        danger:    "var(--danger)",    "danger-soft":"var(--danger-soft)","danger-line":"var(--danger-line)",
        info:      "var(--info)",      "info-soft": "var(--info-soft)", "info-line": "var(--info-line)",
        purpleAcc: "var(--purple)",    "purple-soft":"var(--purple-soft)","purple-line":"var(--purple-line)",
        "gray-badge":"var(--gray-badge)","gray-soft":"var(--gray-soft)","gray-line":"var(--gray-line)",
      },
      fontFamily: {
        display: ["var(--font-display)", "Source Serif Pro", "Georgia", "serif"],
        ui:      ["var(--font-ui)", "Helvetica Neue", "Helvetica", "Arial", "sans-serif"],
        mono:    ["var(--font-mono)", "ui-monospace", "monospace"],
        didone:  ["var(--font-didone)", "Bodoni Moda", "Didot", "serif"],
      },
      borderRadius: {
        none: "0",
        xs: "3px",
        sm: "4px",
        DEFAULT: "6px",
        md: "6px",
        lg: "10px",
        xl: "16px",
      },
      boxShadow: {
        xs: "0 1px 0 oklch(0.18 0.014 260 / 0.04)",
        sm: "0 1px 2px oklch(0.18 0.014 260 / 0.06), 0 1px 1px oklch(0.18 0.014 260 / 0.04)",
        md: "0 4px 12px oklch(0.18 0.014 260 / 0.07), 0 2px 4px oklch(0.18 0.014 260 / 0.05)",
        lg: "0 16px 40px oklch(0.18 0.014 260 / 0.10), 0 4px 12px oklch(0.18 0.014 260 / 0.05)",
        "accent-glow": "0 1px 0 oklch(0.20 0.012 250 / 0.06), 0 2px 6px oklch(0.55 0.16 30 / 0.16)",
        "focus-accent": "0 0 0 3px var(--accent-soft)",
        "focus-danger": "0 0 0 3px var(--danger-soft)",
      },
    },
  },
  plugins: [],
};

export default config;
