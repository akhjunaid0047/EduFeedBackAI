import { ReactNode } from "react";
import { clsx } from "clsx";

interface CardProps {
  title?: string;
  subtitle?: string;
  actions?: ReactNode;
  /** Add body padding (default true). Set false for tables / dense lists. */
  padded?: boolean;
  elevated?: boolean;
  children: ReactNode;
  className?: string;
  footer?: ReactNode;
}

export function Card({
  title, subtitle, actions, padded = true, elevated, children, className, footer,
}: CardProps) {
  return (
    <section className={clsx("card", elevated && "card-elev", className)}>
      {(title || subtitle || actions) && (
        <header className="card-head">
          <div>
            {title && <h3 className="card-title">{title}</h3>}
            {subtitle && <p className="card-sub">{subtitle}</p>}
          </div>
          {actions && <div className="card-actions">{actions}</div>}
        </header>
      )}
      <div className={padded ? "card-body" : "card-flush"}>{children}</div>
      {footer && <footer className="card-foot">{footer}</footer>}
    </section>
  );
}
