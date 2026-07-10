import Link from "next/link";
import { cn } from "@/shared/utils/cn";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface EmptyStateProps {
  /** Eyebrow kicker in mono uppercase. Default: "CATÁLOGO" */
  eyebrow?: string;
  /** Heading message. Default: "Todavía no hay inmuebles en esta categoría." */
  message?: string;
  /** Secondary body text. Default: "Prueba a ajustar los filtros para encontrar lo que buscas." */
  description?: string;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function EmptyState({
  eyebrow = "CATÁLOGO",
  message = "Todavía no hay inmuebles en esta categoría.",
  description = "Prueba a ajustar los filtros para encontrar lo que buscas.",
}: EmptyStateProps) {
  return (
    <div className="mx-auto flex max-w-[480px] flex-col items-center py-20 text-center">
      {/* Eyebrow */}
      <span
        className={cn(
          "relative mb-4 pl-[44px] font-mono text-[11px] font-medium uppercase tracking-[0.22em] text-accent-default",
          "before:absolute before:left-0 before:top-1/2 before:h-px before:w-8 before:-translate-y-1/2",
          "before:bg-[linear-gradient(90deg,var(--accent-default),transparent)]",
        )}
      >
        {eyebrow}
      </span>

      {/* Heading */}
      <h2 className="mb-4 font-display text-[19px] font-medium leading-[1.35] tracking-[-0.015em] text-fg-default">
        {message}
      </h2>

      {/* Body */}
      <p className="mb-8 font-sans text-sm leading-[1.5] text-fg-subtle">
        {description}
      </p>

      {/* Action */}
      <Link
        href="/portafolio"
        className={cn(
          "inline-flex items-center justify-center rounded-pill border-[1.5px] border-fg-default bg-transparent px-[26.5px] py-[13.5px]",
          "font-sans text-base font-medium tracking-[-0.005em] text-fg-default",
          "transition-all duration-deliberate ease-standard",
          "hover:bg-fg-default hover:text-bg-canvas",
          "focus-visible:outline-2 focus-visible:outline-focus-ring focus-visible:outline-offset-3 focus-visible:rounded-[4px]",
        )}
      >
        Ver todas las promociones
      </Link>
    </div>
  );
}
