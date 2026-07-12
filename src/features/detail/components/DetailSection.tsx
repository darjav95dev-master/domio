import type { ReactNode } from "react";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type SectionBg = "white" | "cream" | "alt";
type TagVariant = "orange" | "purple" | "gold";

export interface DetailSectionProps {
  /** Full-bleed background band. Sections alternate to create editorial rhythm. */
  bg?: SectionBg;
  /** Small mono eyebrow above the heading, with a leading rule. */
  tag?: string;
  tagVariant?: TagVariant;
  /** Section heading (Fraunces display). */
  title?: ReactNode;
  titleId?: string;
  /** Optional sub-paragraph under the heading. */
  subtitle?: ReactNode;
  /** Anchor id for the section band. */
  id?: string;
  ariaLabel?: string;
  /** Constrain the inner content width. Defaults to 1180px (reference max). */
  contentMaxWidth?: string;
  children: ReactNode;
}

// ---------------------------------------------------------------------------
// Style maps (ported 1:1 from CoviCanarias reference .sec / .tag-* rules)
// ---------------------------------------------------------------------------

const BG_CLASS: Record<SectionBg, string> = {
  white: "bg-bg-canvas",
  cream: "bg-bg-surface-sunken",
  // reference --tp-cream-2 #EDE5D2 has no semantic token; one-off band tint.
  alt: "bg-[#ede5d2]",
};

const TAG_CLASS: Record<TagVariant, string> = {
  orange: "text-terracota before:bg-terracota",
  purple: "text-fg-subtle before:bg-fg-subtle",
  gold: "text-[#7a6024] before:bg-gold",
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

/**
 * DetailSection — the editorial band primitive used across the property detail
 * template. Renders a full-width tinted section with a centered head
 * (mono eyebrow + display heading + optional sub-paragraph), matching the
 * CoviCanarias detail reference. Reused by every stacked section so the
 * rhythm and typography stay identical across all inmuebles/promociones.
 */
export function DetailSection({
  bg = "white",
  tag,
  tagVariant = "orange",
  title,
  titleId,
  subtitle,
  id,
  ariaLabel,
  contentMaxWidth = "1180px",
  children,
}: DetailSectionProps) {
  return (
    <section
      id={id}
      aria-label={ariaLabel}
      className={`${BG_CLASS[bg]} px-6 pt-8 pb-18 md:px-14 md:pt-12 md:pb-30`}
    >
      {(tag || title || subtitle) && (
        <div className="mx-auto mb-12 max-w-[640px] text-center md:mb-18">
          {tag && (
            <p
              className={`mb-[18px] inline-flex items-center gap-[10px] font-mono text-[11px] font-medium uppercase tracking-[0.18em] before:inline-block before:h-px before:w-6 before:content-[''] ${TAG_CLASS[tagVariant]}`}
            >
              {tag}
            </p>
          )}
          {title && (
            <h2
              id={titleId}
              className="font-display text-[clamp(34px,5vw,54px)] font-normal leading-[1.0] tracking-[-0.025em] text-fg-default"
            >
              {title}
            </h2>
          )}
          {subtitle && (
            <div className="mx-auto mt-[18px] max-w-[520px] text-[15px] leading-[1.75] text-fg-muted">
              {subtitle}
            </div>
          )}
        </div>
      )}

      <div className="mx-auto" style={{ maxWidth: contentMaxWidth }}>
        {children}
      </div>
    </section>
  );
}
