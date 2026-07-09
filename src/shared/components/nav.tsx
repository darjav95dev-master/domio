"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { cn } from "@/shared/utils/cn";

const NAV_LINKS = [
  { label: "Portafolio", href: "/portafolio" },
  { label: "Contacto", href: "/contacto" },
  { label: "Sobre", href: "/sobre" },
] as const;

const SCROLL_THRESHOLD = 40;

/**
 * Nav — fixed navigation with over-hero/glass mode transition.
 *
 * - Fixed top, z-100
 * - Default: glass mode (safe for SSR / no-JS)
 * - Client: if scroll < 40px → over-hero mode (transparent, white text)
 * - Mobile (<768px): hamburger + drawer with links
 * - Respects prefers-reduced-motion
 */
export function Nav() {
  const [isScrolled, setIsScrolled] = useState(true);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  const handleScroll = useCallback(() => {
    const scrolled = window.scrollY > SCROLL_THRESHOLD;
    setIsScrolled(scrolled);
  }, []);

  useEffect(() => {
    // Only use transparent (over-hero) mode if the page has a dark hero
    // section as first child of <main>. On light-background pages like
    // portafolio, stay in scrolled (solid) mode to avoid white-on-light
    // contrast failures.
    const main = document.getElementById("main-content");
    const hasDarkHero = main?.firstElementChild?.matches(
      '[class*="bg-bg-band-ink"], [class*="h-[520px]"], [class*="h-\\[520"]',
    );

    if (hasDarkHero) {
      handleScroll();
    } else {
      setIsScrolled(true);
    }

    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, [handleScroll]);

  // Close drawer on route change (link click)
  const closeDrawer = useCallback(() => {
    setIsDrawerOpen(false);
  }, []);

  return (
    <>
      <nav
        className={cn(
          // Layout: fixed, full-width, z-100
          "fixed inset-x-0 top-0 z-[100]",
          "px-[24px] md:px-[56px]",
          // Transition
          "transition-all duration-350 ease-standard",
          // Motion safe
          "motion-safe:transition-all motion-safe:duration-350 motion-safe:ease-standard",
          "motion-reduce:transition-none motion-reduce:duration-0",
          // Over-hero vs glass mode
          isScrolled
            ? "bg-[rgba(251,248,243,.85)] text-fg-default shadow-[0_1px_0_var(--border-line-soft)] py-[16px] backdrop-blur-[20px]"
            : "bg-transparent text-white py-[22px]",
        )}
        role="navigation"
        aria-label="Navegación principal"
      >
        <div className="mx-auto flex max-w-[1280px] items-center justify-between">
          {/* Logo */}
          <Link
            href="/"
            className="font-display text-[20px] font-medium"
            aria-label="Domio — Ir a inicio"
          >
            <em className="font-display text-[20px] font-medium not-italic">
              Domio
            </em>
          </Link>

          {/* Desktop links */}
          <div className="hidden items-center gap-[32px] md:flex">
            {NAV_LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={cn(
                  "relative font-sans text-sm font-medium",
                  // Underline hover animation (0→100% width)
                  "after:absolute after:bottom-[-2px] after:left-1/2 after:h-[1px] after:w-0",
                  "after:bg-current after:transition-all after:duration-250 after:ease-standard",
                  "hover:after:left-0 hover:after:w-full",
                  isScrolled ? "text-fg-default" : "text-white",
                )}
              >
                {link.label}
              </Link>
            ))}

            {/* CTA pill */}
            <Link
              href="/contacto"
              className={cn(
                "rounded-pill px-[22px] py-[11px] font-sans text-sm font-medium",
                "transition-all duration-250 ease-standard",
                "hover:-translate-y-px",
                isScrolled
                  ? "bg-fg-default text-bg-canvas hover:bg-accent-default"
                  : "bg-white/95 text-fg-default hover:bg-white",
              )}
              aria-label="Contactar"
            >
              Contactar
            </Link>
          </div>

          {/* Mobile hamburger */}
          <button
            type="button"
            className="flex items-center justify-center md:hidden"
            aria-label={isDrawerOpen ? "Cerrar menú" : "Abrir menú"}
            aria-expanded={isDrawerOpen}
            onClick={() => setIsDrawerOpen((prev) => !prev)}
          >
            <HamburgerIcon isOpen={isDrawerOpen} color={isScrolled ? "var(--fg-default)" : "#fff"} />
          </button>
        </div>
      </nav>

      {/* Mobile drawer overlay */}
      {isDrawerOpen && (
        <div
          className="fixed inset-0 z-[90] bg-black/40 md:hidden"
          onClick={closeDrawer}
          aria-hidden="true"
        />
      )}

      {/* Mobile drawer */}
      <div
        className={cn(
          "fixed right-0 top-0 z-[99] flex h-full w-[280px] flex-col",
          "bg-bg-canvas shadow-lg md:hidden",
          "transition-transform duration-350 ease-standard motion-reduce:transition-none",
          isDrawerOpen ? "translate-x-0" : "translate-x-full",
        )}
        role="dialog"
        aria-modal={isDrawerOpen}
        aria-label="Menú de navegación"
      >
        <div className="flex items-center justify-between px-[24px] py-[22px]">
          <span className="font-display text-[20px] font-medium text-fg-default">
            Domio
          </span>
          <button
            type="button"
            className="flex items-center justify-center"
            aria-label="Cerrar menú"
            onClick={closeDrawer}
          >
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              aria-hidden="true"
            >
              <path d="M6 6L18 18M6 18L18 6" />
            </svg>
          </button>
        </div>

        <nav aria-label="Enlaces de navegación móvil" className="flex-1 px-[24px]">
          <ul className="space-y-[4px]">
            {NAV_LINKS.map((link) => (
              <li key={link.href}>
                <Link
                  href={link.href}
                  onClick={closeDrawer}
                  className="block rounded-[8px] px-[16px] py-[12px] font-sans text-base text-fg-default transition-colors duration-150 hover:bg-accent-subtle"
                >
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        <div className="px-[24px] pb-[32px]">
          <Link
            href="/contacto"
            onClick={closeDrawer}
            className="block rounded-pill bg-fg-default px-[22px] py-[11px] text-center font-sans text-sm font-medium text-bg-canvas transition-all duration-250 hover:bg-accent-default"
          >
            Contactar
          </Link>
        </div>
      </div>

      {/* No-JS fallback: force solid background */}
      <noscript>
        <style>{`
          nav { background: rgba(251,248,243,.85) !important; backdrop-filter: blur(20px) !important; }
        `}</style>
      </noscript>
    </>
  );
}

/* ─── Hamburger icon ─────────────────────────────────── */

function HamburgerIcon({
  isOpen,
  color,
}: {
  isOpen: boolean;
  color: string;
}) {
  return (
    <svg
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth="2"
      strokeLinecap="round"
      aria-hidden="true"
    >
      {isOpen ? (
        <path d="M6 6L18 18M6 18L18 6" />
      ) : (
        <>
          <path d="M4 6H20" />
          <path d="M4 12H20" />
          <path d="M4 18H20" />
        </>
      )}
    </svg>
  );
}
