import type { ReactNode } from "react";
import { cn } from "@/shared/utils/cn";

export interface SkeletonProps {
  className?: string;
  children?: ReactNode;
}

export function Skeleton({ className, children }: SkeletonProps) {
  return (
    <div
      role="status"
      aria-hidden="true"
      className={cn(
        "bg-surface-sunken",
        "bg-[linear-gradient(90deg,var(--bg-surface-sunken)_25%,var(--bg-canvas)_50%,var(--bg-surface-sunken)_75%)]",
        "bg-[length:200%_100%]",
        "animate-shimmer",
        className,
      )}
    >
      {children}
    </div>
  );
}
