import { ReactNode } from "react";
import { clsx } from "clsx";

interface PageHeadProps {
  eyebrow?: string;
  title: string;
  lede?: string;
  actions?: ReactNode;
  className?: string;
}

export function PageHead({ eyebrow, title, lede, actions, className }: PageHeadProps) {
  return (
    <header className={clsx(
      "flex items-end justify-between gap-6 pb-[22px] mb-[22px] border-b border-line-2 flex-wrap",
      className,
    )}>
      <div className="min-w-0">
        {eyebrow && <p className="eyebrow mb-2">{eyebrow}</p>}
        <h1 className="font-display text-[36px] font-medium text-ink leading-[1.12] tracking-[-0.02em] m-0 text-pretty">
          {title}
        </h1>
        {lede && (
          <p className="text-[14px] text-ink-2 max-w-[580px] mt-3 m-0">{lede}</p>
        )}
      </div>
      {actions && (
        <div className="flex gap-2 items-center flex-nowrap shrink-0 justify-end">
          {actions}
        </div>
      )}
    </header>
  );
}
