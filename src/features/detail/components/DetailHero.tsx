import { MediaImage } from "@/shared/components/media-image";
import { getPublicMediaUrl } from "@/infrastructure/media/public-url";
import {
  PROPERTY_TYPE_LABELS,
  CONSTRUCTION_STATUS_LABELS,
} from "@/shared/constants/domain-labels";
import { ShareButton } from "@/features/engagement/components/ShareButton";
import { FavoriteButton } from "@/features/favorites/FavoriteButton";
import type { PromocionDetail } from "@/infrastructure/db/repositories/promocion.repository";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface DetailHeroProps {
  promocion: PromocionDetail;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Status dot color, ported from the CoviCanarias reference badge. */
const STATUS_DOT: Record<string, string> = {
  IN_CONSTRUCTION: "#7DD17D",
  ON_PLAN: "#FFD9B0",
  READY: "#C9A14A",
};

function getCoverImage(promocion: PromocionDetail): {
  r2Key: string;
  altText: string;
} | null {
  const cover = promocion.mediaAssets.find(
    (a) => a.kind === "IMAGE_GALLERY" && a.isCover,
  );
  if (cover) {
    return { r2Key: cover.r2Key, altText: cover.altText };
  }
  const first = promocion.mediaAssets.find((a) => a.kind === "IMAGE_GALLERY");
  if (first) {
    return { r2Key: first.r2Key, altText: first.altText };
  }
  return null;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

/**
 * DetailHero — full-bleed hero ported from the CoviCanarias detail reference:
 * cover photo dimmed over ink, a glass status pill (with a state-colored dot)
 * at the top of the content block, the display name, and an address line with
 * a pin icon. Share / Favorite live top-right.
 */
export function DetailHero({ promocion }: DetailHeroProps) {
  const cover = getCoverImage(promocion);
  const propertyTypeLabel =
    promocion.propertyType &&
    PROPERTY_TYPE_LABELS[
      promocion.propertyType as keyof typeof PROPERTY_TYPE_LABELS
    ];
  const constructionLabel =
    promocion.constructionStatus &&
    CONSTRUCTION_STATUS_LABELS[
      promocion.constructionStatus as keyof typeof CONSTRUCTION_STATUS_LABELS
    ];
  const dotColor =
    (promocion.constructionStatus && STATUS_DOT[promocion.constructionStatus]) ||
    "#C9A14A";

  const address =
    promocion.address ??
    [promocion.municipality, promocion.island].filter(Boolean).join(", ");

  return (
    <section
      className="relative flex h-[440px] w-full items-end overflow-hidden bg-bg-band-ink md:h-[520px]"
      aria-label={`Detalle de ${promocion.name}`}
    >
      {/* Background image dimmed over ink */}
      {cover ? (
        <MediaImage
          alt={cover.altText}
          src={getPublicMediaUrl(cover.r2Key)}
          fill
          sizes="100vw"
          className="object-cover object-[center_35%] opacity-45 contrast-[0.96] saturate-[0.92] brightness-[1.02]"
          priority
        />
      ) : (
        <div
          className="h-full w-full bg-[linear-gradient(135deg,var(--color-ink-2),var(--color-ink))]"
          role="img"
          aria-label={`${promocion.name}, ${propertyTypeLabel ?? "inmueble"}, ${promocion.municipality ?? ""}`}
        />
      )}

      {/* Bottom-weighted ink gradient */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "linear-gradient(180deg, rgba(26,20,16,0.20) 0%, rgba(26,20,16,0.75) 100%)",
        }}
      />

      {/* Share / Favorite — top-right */}
      <div className="absolute right-6 top-6 z-above flex items-center gap-3 md:right-10">
        <ShareButton variant="onDark" />
        <FavoriteButton id={promocion.id} name={promocion.name} />
      </div>

      {/* Content at bottom */}
      <div className="relative z-above w-full p-6 md:p-14">
        <div className="mx-auto max-w-[1280px]">
          {/* Status pill with state-colored dot */}
          {constructionLabel && (
            <div className="mb-[18px] inline-flex items-center gap-[6px] rounded-pill border border-white/25 bg-white/15 px-[14px] py-[6px] font-mono text-[11px] font-semibold uppercase tracking-[0.1em] text-white backdrop-blur-[8px]">
              <span
                className="h-[6px] w-[6px] rounded-full"
                style={{ background: dotColor }}
                aria-hidden="true"
              />
              {constructionLabel}
            </div>
          )}

          {/* H1 */}
          <h1 className="mb-[14px] font-display text-[clamp(36px,5vw,68px)] font-normal leading-[1.02] tracking-[-0.035em] text-white">
            {promocion.name}
          </h1>

          {/* Address line with pin */}
          {address && (
            <div className="inline-flex items-center gap-[10px] text-[14px] text-white/85">
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="h-[14px] w-[14px] shrink-0 opacity-85"
                aria-hidden="true"
              >
                <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z" />
                <circle cx="12" cy="10" r="3" />
              </svg>
              {address}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
