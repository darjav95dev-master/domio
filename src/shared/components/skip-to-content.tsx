"use client";

import { type ComponentPropsWithoutRef } from "react";
import { cn } from "@/shared/utils/cn";

export type SkipToContentProps = ComponentPropsWithoutRef<"a">;

/**
 * SkipToContent — enlace accesible "Saltar al contenido" que aparece
 * visible solo al recibir foco (tabulación). Al activar, mueve el foco
 * al `<main id="main-content">`.
 *
 * - `sr-only` hasta focus: invisible visualmente pero presente en DOM.
 * - `focus-visible`: fondo bone, texto ink, ring terracota (design tokens).
 * - Sigue WCAG 2.1 AA — enlace de salto de navegación.
 */
export function SkipToContent({ className, ...props }: SkipToContentProps) {
  return (
    <a
      href="#main-content"
      className={cn(
        // sr-only until focused
        "sr-only focus-visible:not-sr-only focus-visible:fixed focus-visible:left-4 focus-visible:top-4",
        // visual style when visible
        "focus-visible:z-overlay-max focus-visible:rounded-pill",
        "focus-visible:bg-bone focus-visible:px-5 focus-visible:py-3",
        "focus-visible:text-fg-default focus-visible:shadow-md",
        // typography
        "font-sans text-sm font-medium",
        // transition
        "transition-all duration-quick ease-standard",
        className,
      )}
      onClick={(e) => {
        e.preventDefault();
        const main = document.getElementById("main-content");
        if (main) {
          main.setAttribute("tabindex", "-1");
          main.focus();
          // Clean up tabindex after focus so it doesn't stay focusable
          setTimeout(() => {
            main.removeAttribute("tabindex");
          }, 100);
        }
      }}
      {...props}
    >
      Saltar al contenido
    </a>
  );
}
