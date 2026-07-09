import { MediaImage } from "@/shared/components/media-image";
import { PROPERTY_TYPE_LABELS, OPERATION_TYPE_LABELS, CONSTRUCTION_STATUS_LABELS } from "@/shared/constants/domain-labels";
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

/** Days after which a property is no longer considered "new". */
const FRESH_DAYS = 14;

function isFresh(date: Date | string): boolean {
  const timestamp = typeof date === "string" ? new Date(date).getTime() : date.getTime();
  const diff = Date.now() - timestamp;
  return diff < FRESH_DAYS * 24 * 60 * 60 * 1000;
}

function isHot(promocion: PromocionDetail): boolean {
  const hasHighPrice =
    promocion.tipologias.some((t) => (t.referencePriceSale ?? 0) >= 300000);
  return promocion.operation === "SALE" && hasHighPrice;
}

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
  const first = promocion.mediaAssets.find(
    (a) => a.kind === "IMAGE_GALLERY",
  );
  if (first) {
    return { r2Key: first.r2Key, altText: first.altText };
  }
  return null;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function DetailHero({ promocion }: DetailHeroProps) {
  const cover = getCoverImage(promocion);
  const fresh = isFresh(promocion.createdAt);
  const hot = isHot(promocion);
  const propertyTypeLabel =
    promocion.propertyType &&
    PROPERTY_TYPE_LABELS[promocion.propertyType as keyof typeof PROPERTY_TYPE_LABELS];
  const operationLabel =
    promocion.operation &&
    OPERATION_TYPE_LABELS[promocion.operation as keyof typeof OPERATION_TYPE_LABELS];
  const constructionLabel =
    promocion.constructionStatus &&
    CONSTRUCTION_STATUS_LABELS[promocion.constructionStatus as keyof typeof CONSTRUCTION_STATUS_LABELS];

  return (
    <section
      className="relative h-[520px] w-full overflow-hidden bg-bg-band-ink"
      aria-label={`Detalle de ${promocion.name}`}
    >
      {/* Background image with warm overlay */}
      {cover ? (
        <MediaImage
          alt={cover.altText}
          src={cover.r2Key}
          fill
          sizes="100vw"
          className="contrast-[0.96] saturate-[0.92] brightness-[1.02] object-cover object-[center_35%]"
          priority
        />
      ) : (
        <div
          className="h-full w-full bg-[linear-gradient(135deg,var(--color-ink-2),var(--color-ink))]"
          role="img"
          aria-label={`${promocion.name}, ${propertyTypeLabel ?? "inmueble"}, ${promocion.municipality ?? ""}`}
        />
      )}

      {/* Warm gradient overlay */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "linear-gradient(180deg, rgba(26,20,16,0.20) 0%, rgba(26,20,16,0.60) 60%, rgba(26,20,16,0.85) 100%)",
        }}
      />

      {/* Badges */}
      <div className="absolute left-6 top-6 z-above flex gap-3">
        {fresh && (
          <span className="rounded-pill bg-accent-default px-3 py-1 font-mono text-[10px] font-medium uppercase leading-normal tracking-[0.16em] text-white">
            LIVE
          </span>
        )}
        {hot && (
          <span className="rounded-pill bg-[rgba(26,20,16,0.7)] px-3 py-1 font-mono text-[10px] font-medium uppercase leading-normal tracking-[0.16em] text-white backdrop-blur-[8px]">
            HOT
          </span>
        )}
      </div>

      {/* Content at bottom */}
      <div className="absolute bottom-0 left-0 right-0 z-above p-6 md:p-10">
        <div className="mx-auto max-w-[1280px]">
          {/* Address / location line */}
          {promocion.municipality && (
            <p className="mb-2 font-mono text-[11px] tracking-[0.04em] tabular-nums text-white/70">
              {[promocion.municipality, promocion.island]
                .filter(Boolean)
                .join(", ")}
            </p>
          )}

          {/* H1 */}
          <h1 className="mb-4 font-display text-[clamp(36px,4.8vw,64px)] font-normal tracking-[-0.035em] leading-[1.05] text-white">
            {promocion.name}
          </h1>

          {/* Pills: type / operation / status */}
          <div className="flex flex-wrap gap-3">
            {propertyTypeLabel && (
              <span className="rounded-pill bg-[rgba(255,255,255,0.12)] px-3 py-1 font-mono text-[10px] font-medium uppercase tracking-[0.16em] text-white backdrop-blur-[4px]">
                {propertyTypeLabel}
              </span>
            )}
            {operationLabel && (
              <span className="rounded-pill bg-[rgba(255,255,255,0.12)] px-3 py-1 font-mono text-[10px] font-medium uppercase tracking-[0.16em] text-white backdrop-blur-[4px]">
                {operationLabel}
              </span>
            )}
            {constructionLabel && (
              <span className="rounded-pill bg-[rgba(255,255,255,0.12)] px-3 py-1 font-mono text-[10px] font-medium uppercase tracking-[0.16em] text-white backdrop-blur-[4px]">
                {constructionLabel}
              </span>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
