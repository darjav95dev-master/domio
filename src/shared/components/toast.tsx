"use client";

import { useEffect, type ReactNode } from "react";
import { cn } from "@/shared/utils/cn";

type ToastVariant = "success" | "warning" | "error" | "info";

export interface ToastProps {
  variant: ToastVariant;
  title: string;
  children?: ReactNode;
  autoDismiss?: number;
  onDismiss?: () => void;
}

const variantStyles: Record<ToastVariant, string> = {
  success:
    "border-status-success-default bg-status-success-subtle text-status-success-default",
  warning:
    "border-status-warning-default bg-status-warning-subtle text-status-warning-default",
  error:
    "border-status-danger-default bg-status-danger-subtle text-status-danger-default",
  info: "border-border-default bg-status-info-subtle text-status-info-default",
};

export function Toast({
  variant,
  title,
  children,
  autoDismiss,
  onDismiss,
}: ToastProps) {
  useEffect(() => {
    if (!autoDismiss) return undefined;
    const timer = setTimeout(() => onDismiss?.(), autoDismiss);
    return () => clearTimeout(timer);
  }, [autoDismiss, onDismiss]);

  return (
    <div
      role="alert"
      aria-live="polite"
      className={cn(
        "rounded-card border px-6 py-4 shadow-md",
        variantStyles[variant],
      )}
    >
      <p className="font-sans text-sm font-semibold">{title}</p>
      {children && (
        <div className="mt-1 font-sans text-sm">{children}</div>
      )}
    </div>
  );
}
