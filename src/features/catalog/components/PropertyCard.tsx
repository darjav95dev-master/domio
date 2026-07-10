import Link from "next/link";
import { MediaImage } from "@/shared/components/media-image";
import { cn } from "@/shared/utils/cn";
import { OPERATION_TYPE_LABELS } from "@/shared/constants/domain-labels";
import { FavoriteButton } from "@/features/favorites/FavoriteButton";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface CatalogItem {
  id: string;
  slug: string | null;
  name: string;
  kind: string;
  status: string;
  operation: string | null;
  propertyType: string | null;
  constructionStatus: string | null;
  island: string | null;
  municipality: string | null;
  address: string | null;
  price: number | null;
  currency: string;
  imageUrl: string | null;
  bedrooms: number | null;
  bathrooms: number | null;
  location: [number, number];
  locationApprox: [number, number];
  mapPrivacyMode: string;
  seoTitle: string | null;
  seoDescription: string | null;
  assignedAgentId: string | null;
  assignedAgentName: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface PropertyCardProps {
  item: CatalogItem;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Days after which a property is no longer considered "new". */
const FRESH_DAYS = 14;

function isFresh(date: Date): boolean {
  const diff = Date.now() - date.getTime();
  return diff < FRESH_DAYS * 24 * 60 * 60 * 1000;
}

function formatPrice(price: number | null): string {
  if (price === null || price === undefined) return "";
  const formatted = new Intl.NumberFormat("es-ES", {
    style: "decimal",
    maximumFractionDigits: 0,
  }).format(price);
  return `${formatted} €`;
}

function formatLocation(
  municipality: string | null,
  island: string | null,
): string {
  return [municipality, island].filter(Boolean).join(", ");
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function PropertyCard({ item }: PropertyCardProps) {
  const {
    slug,
    name,
    operation,
    island,
    municipality,
    price,
    bedrooms,
    bathrooms,
    imageUrl,
    createdAt,
  } = item;

  const locationText = formatLocation(municipality, island);
  const ariaLabel = `${name}, ${locationText}, ${price ? formatPrice(price) : ""}`;

  const isHot = operation === "SALE" && price !== null && price >= 300000;
  const isNew = isFresh(createdAt);
  const operationLabel =
    operation && operation !== "SALE_AND_RENT"
      ? OPERATION_TYPE_LABELS[operation as keyof typeof OPERATION_TYPE_LABELS]
      : null;

  return (
    <article
      aria-label={ariaLabel}
      className={cn(
        "group relative flex flex-col overflow-hidden rounded-surface bg-bg-surface shadow-[0_1px_2px_rgba(var(--shadow-tint),0.04),0_4px_12px_rgba(var(--shadow-tint),0.04)]",
        "transition-all duration-slow ease-standard",
        "hover:-translate-y-1.5 hover:shadow-[0_2px_4px_rgba(var(--shadow-tint),0.04),0_12px_24px_rgba(var(--shadow-tint),0.06),0_24px_48px_rgba(var(--shadow-tint),0.04)]",
      )}
    >
      {/* -- Image block --------------------------------------------------- */}
      <Link
        href={`/inmuebles/${slug}`}
        className="relative block aspect-[4/3] overflow-hidden"
        aria-label={undefined}
        tabIndex={-1}
      >
        {imageUrl ? (
          <MediaImage
            alt={`${name}, ${item.propertyType ?? "inmueble"}, ${locationText}`}
            src={imageUrl}
            fill
            sizes="(max-width: 768px) 100vw, (max-width: 1280px) 50vw, 33vw"
            className={cn(
              "object-cover object-[center_35%]",
              "contrast-[0.96] saturate-[0.92] brightness-[1.02]",
              "transition-transform duration-image ease-standard group-hover:scale-105",
            )}
          />
        ) : (
          <div
            className="h-full w-full bg-[linear-gradient(135deg,var(--color-ink-2),var(--color-ink))]"
            role="img"
            aria-label={`${name}, ${item.propertyType ?? "inmueble"}, ${locationText}`}
          />
        )}

        {/* Badges */}
        {isNew && (
          <span className="absolute left-4 top-4 rounded-pill bg-accent-default px-3 py-1 font-mono text-[10px] font-medium uppercase leading-normal tracking-[0.16em] text-white">
            LIVE
          </span>
        )}
        {isHot && (
          <span className="absolute right-4 top-4 rounded-pill bg-[rgba(26,20,16,0.7)] px-3 py-1 font-mono text-[10px] font-medium uppercase leading-normal tracking-[0.16em] text-white backdrop-blur-[8px]">
            HOT
          </span>
        )}
        {operationLabel && (
          <span className="absolute bottom-4 left-4 rounded-pill bg-fg-default/70 px-3 py-1 font-mono text-[10px] font-medium uppercase leading-normal tracking-[0.16em] text-white backdrop-blur-[4px]">
            {operationLabel.toUpperCase()}
          </span>
        )}
      </Link>

      {/* Favorite toggle — sibling of the image link, above the card overlay */}
      <FavoriteButton
        id={item.id}
        name={name}
        className="absolute bottom-4 right-4"
      />

      {/* -- Body ---------------------------------------------------------- */}
      <div className="flex flex-1 flex-col px-6 pb-6 pt-[22px]">
        {/* Location */}
        <p className="mb-1 font-mono text-[11px] tracking-[0.04em] tabular-nums text-fg-subtle">
          {locationText}
        </p>

        {/* Name */}
        <h2 className="mb-2 font-display text-2xl font-medium tracking-[-0.015em] text-fg-default line-clamp-2">
          <Link
            href={`/inmuebles/${slug}`}
            className="after:absolute after:inset-0 after:z-10 focus-visible:outline-2 focus-visible:outline-focus-ring focus-visible:outline-offset-3 focus-visible:rounded-[4px]"
          >
            {name}
          </Link>
        </h2>

        {/* Price */}
        {price !== null && (
          <p className="mb-3 font-mono text-base font-semibold tabular-nums tracking-[0.04em] text-fg-default">
            {formatPrice(price)}
          </p>
        )}

        {/* Meta: bedrooms & bathrooms */}
        {(bedrooms || bathrooms) && (
          <div className="mt-auto flex items-center gap-4 border-t border-border-default pt-4">
            {bedrooms && (
              <span className="font-sans text-sm text-fg-muted">
                {bedrooms} dorm.
              </span>
            )}
            {bathrooms && (
              <span className="font-sans text-sm text-fg-muted">
                {bathrooms} bañ.
              </span>
            )}
          </div>
        )}
      </div>
    </article>
  );
}
