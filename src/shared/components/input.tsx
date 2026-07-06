import { type InputHTMLAttributes, forwardRef } from "react";
import { cn } from "@/shared/utils/cn";

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  id: string;
  label: string;
  error?: string;
  helpText?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  (
    { id, label, error, helpText, disabled = false, className, ...props },
    ref,
  ) => {
    const errorId = error ? `${id}-error` : undefined;
    const helpId = helpText ? `${id}-help` : undefined;
    const describedBy = [helpId, errorId].filter(Boolean).join(" ") || undefined;

    return (
      <div className="flex flex-col gap-1">
        <label
          htmlFor={id}
          className="font-mono text-[10px] font-medium uppercase tracking-[0.16em] text-fg-subtle"
        >
          {label}
        </label>
        <input
          ref={ref}
          id={id}
          disabled={disabled}
          aria-describedby={describedBy}
          aria-invalid={Boolean(error)}
          className={cn(
            "rounded-control border bg-bg-surface px-4 py-3 font-sans text-base text-fg-default placeholder:text-fg-subtle",
            "transition-colors duration-standard ease-standard",
            "hover:border-border-strong",
            "focus:border-accent-default",
            error
              ? "border-status-danger-default"
              : "border-border-default",
            disabled && "cursor-not-allowed bg-surface-sunken opacity-60",
            className,
          )}
          {...props}
        />
        {error && (
          <p
            id={errorId}
            role="alert"
            aria-live="polite"
            className="font-sans text-sm text-status-danger-default"
          >
            {error}
          </p>
        )}
        {helpText && !error && (
          <p id={helpId} className="font-sans text-sm text-fg-subtle">
            {helpText}
          </p>
        )}
      </div>
    );
  },
);

Input.displayName = "Input";
