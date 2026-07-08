"use client";

import Link from "next/link";
import type { NavItem as NavItemType } from "@/features/backoffice/constants/nav-items";
import { ICON_SIZES } from "@/shared/constants/iconography";
import { cn } from "@/shared/utils/cn";

export interface NavItemProps {
  /** The navigation item config (label, href, icon, badges, etc.) */
  item: NavItemType;
  /** Whether this item matches the current pathname */
  isActive: boolean;
  /** Current pathname from usePathname — kept for future heuristics */
  currentPathname: string;
}

/**
 * A single navigation item in the backoffice sidebar.
 *
 * Renders a Next.js Link with a Phosphor icon, a label, and an optional
 * badge slot for `badgeKey` (UnreadBadge integration later — T019).
 *
 * Active state: border-left 3px `accent`, subtle bg tint, icon accent-colored.
 * aria-current="page" when active.
 */
export function NavItem({ item, isActive }: NavItemProps) {
  const Icon = item.icon;

  return (
    <Link
      href={item.href}
      aria-current={isActive ? "page" : undefined}
      className={cn(
        "group flex items-center gap-3 rounded-r-md px-4 py-2.5",
        "text-sm font-medium leading-normal transition-colors duration-standard ease-standard",
        "text-fg-on-inverted hover:bg-slate-2/20 focus-visible:outline-offset-[-2px]",
        isActive
          ? "border-l-[3px] border-accent-default bg-slate-2/10 text-fg-on-inverted"
          : "border-l-[3px] border-transparent",
      )}
    >
      <Icon
        size={ICON_SIZES.nav}
        weight="regular"
        className={cn(
          "shrink-0 transition-colors duration-standard",
          isActive ? "text-accent-default" : "text-fg-on-inverted/70",
        )}
        aria-hidden="true"
      />
      <span className="flex-1 truncate">{item.label}</span>
      {item.badgeKey && (
        <span
          data-badge-key={item.badgeKey}
          className="shrink-0"
          aria-hidden="true"
        />
      )}
    </Link>
  );
}
