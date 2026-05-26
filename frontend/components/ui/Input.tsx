import { InputHTMLAttributes, forwardRef, ReactNode } from "react";
import { clsx } from "clsx";

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  hint?: string;
  append?: ReactNode;
  icon?: ReactNode;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, hint, append, icon, className, id, ...props }, ref) => {
    const inputId = id || label?.toLowerCase().replace(/\s+/g, "-");
    const showLabel = !!label || !!append;
    return (
      <div className="field">
        {showLabel && (
          <div className="field-label">
            <label htmlFor={inputId} className="field-label-text">
              {label}{props.required && <span className="req">*</span>}
            </label>
            {append}
          </div>
        )}
        <span className={clsx("input-wrap", icon && "has-icon", error && "is-error")}>
          {icon && icon}
          <input
            ref={ref}
            id={inputId}
            className={clsx("input", className)}
            {...props}
          />
        </span>
        {error && <span className="field-error">{error}</span>}
        {!error && hint && <span className="field-hint">{hint}</span>}
      </div>
    );
  }
);
Input.displayName = "Input";
