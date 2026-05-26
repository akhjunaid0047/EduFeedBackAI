import { SelectHTMLAttributes, forwardRef } from "react";
import { clsx } from "clsx";
import { ChevronDown } from "lucide-react";

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  hint?: string;
  options: { value: string; label: string }[] | string[];
  placeholder?: string;
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ label, error, hint, options, placeholder, className, id, ...props }, ref) => {
    const selectId = id || label?.toLowerCase().replace(/\s+/g, "-");
    const opts = (options as any[]).map((o) =>
      typeof o === "string" ? { value: o, label: o } : o
    ) as { value: string; label: string }[];

    return (
      <div className="field">
        {label && (
          <div className="field-label">
            <label htmlFor={selectId} className="field-label-text">
              {label}{props.required && <span className="req">*</span>}
            </label>
          </div>
        )}
        <span className={clsx("input-wrap", error && "is-error")} style={{ position: "relative" }}>
          <select
            ref={ref}
            id={selectId}
            className={clsx("input select", className)}
            {...props}
          >
            {placeholder && <option value="">{placeholder}</option>}
            {opts.map((opt) => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
          <ChevronDown
            size={14}
            style={{ position: "absolute", right: 10, color: "var(--ink-3)", pointerEvents: "none" }}
          />
        </span>
        {error && <span className="field-error">{error}</span>}
        {!error && hint && <span className="field-hint">{hint}</span>}
      </div>
    );
  }
);
Select.displayName = "Select";
