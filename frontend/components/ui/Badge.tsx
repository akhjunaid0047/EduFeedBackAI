import { clsx } from "clsx";
import { ReactNode } from "react";

interface BadgeProps {
  children: ReactNode;
  tone?: "green" | "red" | "orange" | "blue" | "gray" | "purple" | "accent" | "ok" | "warn" | "danger" | "info";
  /** Back-compat: same as `tone`. */
  color?: "green" | "red" | "orange" | "blue" | "gray" | "purple" | "accent";
  size?: "sm" | "md";
  solid?: boolean;
  dot?: boolean;
  /** Reserved for icon prop (not yet wired) */
  icon?: string;
}

export function Badge({ children, tone, color, size = "md", solid = false, dot = false }: BadgeProps) {
  const t = tone || color || "gray";
  return (
    <span
      className={clsx(
        "badge",
        size === "sm" && "badge-sm",
        solid ? "badge-solid" : "badge-soft",
        `badge-${t}`,
      )}
    >
      {dot && <span className="badge-dot" />}
      {children}
    </span>
  );
}
