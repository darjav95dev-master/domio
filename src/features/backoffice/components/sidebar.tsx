"use client";

import { useState, useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import { List, X } from "@phosphor-icons/react";
import { NAV_ITEMS } from "@/features/backoffice/constants/nav-items";
import { NavItem } from "@/features/backoffice/components/nav-item";
import { UnreadBadge } from "@/features/backoffice/components/unread-badge";
import { ICON_SIZES } from "@/shared/constants/iconography";
import { cn } from "@/shared/utils/cn";
import type { UserRole } from "@/shared/constants/db-enums";

interface SidebarProps {
  /** The current user's role for filtering nav items */
  role: UserRole;
}

/**
 * Sidebar — main navigation for the backoffice panel.
 *
 * **Desktop** (`>=768px`):
 *   - Fixed 240px column with `bg.inverted` (slate #2E2B27)
 *   - Logo "Domio" in Fraunces italic
 *   - Nav items filtered by user role, with active indicator
 *
 * **Mobile** (`<768px`):
 *   - Hidden sidebar, floating hamburger button (Phosphor List icon)
 *   - Opens a drawer overlay with focus trap and close-on-navigate
 *   - Drawer: `aria-modal="true"`, focus trap (Tab/Shift+Tab), closes on Escape
 *
 * @see design.md §13.5
 */
export function Sidebar({ role }: SidebarProps) {
  const pathname = usePathname();
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const drawerRef = useRef<HTMLDivElement>(null);

  // Filter nav items by the user's allowed roles
  const filteredItems = NAV_ITEMS.filter((item) =>
    item.allowedRoles.includes(role),
  );

  // Close drawer on navigation (pathname change)
  useEffect(() => {
    setIsMobileOpen(false);
  }, [pathname]);

  // Focus trap for the mobile drawer
  useEffect(() => {
    if (!isMobileOpen) return;

    const drawer = drawerRef.current;
    if (!drawer) return;

    const focusable = drawer.querySelectorAll<HTMLElement>(
      'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])',
    );
    const firstFocusable = focusable[0];
    const lastFocusable = focusable[focusable.length - 1];

    // Move focus inside the drawer
    firstFocusable?.focus();

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setIsMobileOpen(false);
        return;
      }

      if (e.key !== "Tab") return;

      if (e.shiftKey) {
        // Shift+Tab: wrap to last when leaving first
        if (document.activeElement === firstFocusable) {
          e.preventDefault();
          lastFocusable?.focus();
        }
      } else {
        // Tab: wrap to first when leaving last
        if (document.activeElement === lastFocusable) {
          e.preventDefault();
          firstFocusable?.focus();
        }
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isMobileOpen]);

  // ── Shared content: logo + nav items ──────────────────────────────────

  const logo = (
    <div className="px-6 pt-5 pb-4">
      <span className="font-display italic text-[20px] leading-none text-fg-on-inverted">
        Domio
      </span>
    </div>
  );

  const navList = (
    <nav aria-label="Navegación del panel">
      <ul className="space-y-0.5 px-2">
        {filteredItems.map((item) => {
          // Dashboard is exact match "/panel"; others are prefix matches
          const isActive =
            item.href === "/panel"
              ? pathname === "/panel"
              : pathname.startsWith(item.href);

          // Leads is the only item with badgeKey — render inline with UnreadBadge
          if (item.badgeKey === "unread-leads") {
            const Icon = item.icon;
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  aria-current={isActive ? "page" : undefined}
                  className={cn(
                    "group flex items-center gap-3 rounded-r-md px-4 py-2.5",
                    "text-sm font-medium leading-normal transition-colors duration-standard ease-standard",
                    "text-fg-on-inverted hover:bg-slate-2/20 focus-visible:outline-offset-[-2px]",
                    isActive
                      ? "border-l-[3px] border-accent-default bg-slate-2/10"
                      : "border-l-[3px] border-transparent",
                  )}
                >
                  <Icon
                    size={ICON_SIZES.nav}
                    weight="regular"
                    className={cn(
                      "shrink-0 transition-colors duration-standard",
                      isActive
                        ? "text-accent-default"
                        : "text-fg-on-inverted/70",
                    )}
                    aria-hidden="true"
                  />
                  <span className="flex items-center gap-2 flex-1 min-w-0">
                    <span className="truncate">{item.label}</span>
                    <UnreadBadge />
                  </span>
                </Link>
              </li>
            );
          }

          return (
            <li key={item.href}>
              <NavItem
                item={item}
                isActive={isActive}
                currentPathname={pathname}
              />
            </li>
          );
        })}
      </ul>
    </nav>
  );

  // ── Desktop sidebar ───────────────────────────────────────────────────

  const desktopSidebar = (
    <aside className="hidden md:fixed md:inset-y-0 md:z-sticky md:flex md:w-[240px] md:flex-col md:overflow-y-auto bg-bg-inverted">
      {logo}
      {navList}
    </aside>
  );

  // ── Mobile drawer ─────────────────────────────────────────────────────

  const mobileHamburger = (
    <button
      type="button"
      onClick={() => setIsMobileOpen(true)}
      aria-label="Abrir menú de navegación"
      className="fixed left-4 top-4 z-nav md:hidden flex items-center justify-center rounded-md bg-bg-surface p-2 text-fg-default shadow-sm"
    >
      <List size={24} aria-hidden="true" />
    </button>
  );

  const mobileDrawer = isMobileOpen && (
    <div
      className="fixed inset-0 z-overlay-max md:hidden"
      role="dialog"
      aria-modal="true"
      aria-label="Menú de navegación"
    >
      {/* Backdrop — click to close */}
      <div
        className="absolute inset-0 bg-black/40"
        onClick={() => setIsMobileOpen(false)}
        aria-hidden="true"
      />

      {/* Drawer panel */}
      <div
        ref={drawerRef}
        className="relative flex h-full w-[240px] flex-col bg-bg-inverted shadow-lg"
      >
        <div className="flex justify-end px-4 pt-4">
          <button
            type="button"
            onClick={() => setIsMobileOpen(false)}
            aria-label="Cerrar menú"
            className="flex items-center justify-center rounded-md p-1 text-fg-on-inverted transition-colors hover:text-fg-on-inverted/70 focus-visible:outline-offset-[-2px]"
          >
            <X size={20} aria-hidden="true" />
          </button>
        </div>
        {logo}
        {navList}
      </div>
    </div>
  );

  return (
    <>
      {desktopSidebar}
      {mobileHamburger}
      {mobileDrawer}
    </>
  );
}
