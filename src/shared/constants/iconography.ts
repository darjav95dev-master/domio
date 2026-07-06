/**
 * Phosphor Icons canonical sizes for Domio.
 *
 * All icons use the Regular weight and a 1.5px stroke.
 * Interactive icons use color.accent.default; structural icons use color.fg.default.
 *
 * @see design.md §14
 */
export const ICON_SIZES = {
  /** Navigation and primary controls. */
  nav: 20,
  /** Inline actions, chips and form adornments. */
  inline: 16,
  /** Metadata rows and compact lists. */
  meta: 12,
} as const;

export const ICON_WEIGHT = "regular" as const;
export const ICON_STROKE = 1.5 as const;
