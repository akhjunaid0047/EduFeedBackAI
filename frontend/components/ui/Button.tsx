import { ButtonHTMLAttributes, ReactNode } from "react";
import { clsx } from "clsx";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "danger" | "ghost" | "soft" | "link";
  size?: "sm" | "md" | "lg";
  loading?: boolean;
  icon?: ReactNode;
  iconPos?: "left" | "right";
  children?: ReactNode;
}

export function Button({
  variant = "primary",
  size = "md",
  loading,
  icon,
  iconPos = "left",
  children,
  className,
  disabled,
  ...props
}: ButtonProps) {
  const variantClass =
    variant === "primary"   ? "btn-primary" :
    variant === "secondary" ? "btn-secondary" :
    variant === "danger"    ? "btn-danger" :
    variant === "ghost"     ? "btn-ghost" :
    variant === "soft"      ? "btn-soft" :
    "btn-link";

  const sizeClass = size === "sm" ? "btn-sm" : size === "lg" ? "btn-lg" : "";

  return (
    <button
      className={clsx("btn", variantClass, sizeClass, className)}
      disabled={disabled || loading}
      {...props}
    >
      {loading && <span className="btn-spin" />}
      {!loading && icon && iconPos === "left" && icon}
      {children && <span className="btn-label">{children}</span>}
      {!loading && icon && iconPos === "right" && icon}
    </button>
  );
}
