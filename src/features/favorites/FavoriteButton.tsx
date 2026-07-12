"use client";

import { cn } from "@/shared/utils/cn";
import { useFavorites } from "./useFavorites";

export interface FavoriteButtonProps {
  /** Promoción id to toggle. */
  id: string;
  /** Promoción name, for accessible labels. */
  name: string;
  className?: string;
}

/**
 * FavoriteButton — heart toggle for saving a promoción to favorites.
 *
 * Used inside PropertyCard (which has an absolute overlay link) and the detail
 * page, so it stops event propagation and sits above the card's link layer.
 */
export function FavoriteButton({ id, name, className }: FavoriteButtonProps) {
  const { isFavorite, toggle, ready } = useFavorites();
  const active = ready && isFavorite(id);

  return (
    <button
      type="button"
      data-testid="favorite-button"
      aria-pressed={active}
      aria-label={
        active ? `Quitar ${name} de favoritos` : `Guardar ${name} en favoritos`
      }
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        toggle(id);
      }}
      className={cn(
        "z-20 flex h-10 w-10 items-center justify-center rounded-full",
        "bg-white/85 text-fg-default backdrop-blur-[4px] shadow-[0_1px_4px_rgba(0,0,0,0.15)]",
        "transition-all duration-250 ease-standard hover:scale-110 hover:bg-white",
        "focus-visible:outline-2 focus-visible:outline-focus-ring focus-visible:outline-offset-2",
        className,
      )}
    >
      <svg
        width="20"
        height="20"
        viewBox="0 0 24 24"
        fill={active ? "currentColor" : "none"}
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className={active ? "text-accent-default" : "text-fg-default"}
        aria-hidden="true"
      >
        <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 1 0-7.78 7.78L12 21.23l8.84-8.84a5.5 5.5 0 0 0 0-7.78z" />
      </svg>
    </button>
  );
}
