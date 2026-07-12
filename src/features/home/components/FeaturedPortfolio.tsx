import Link from "next/link";
import { MediaImage } from "@/shared/components/media-image";
import {
  PROPERTY_TYPE_LABELS,
  OPERATION_TYPE_LABELS,
  CONSTRUCTION_STATUS_LABELS,
} from "@/shared/constants/domain-labels";
import type {
  PropertyType,
  OperationType,
  ConstructionStatus,
} from "@/shared/constants/db-enums";
import type { FeaturedPromocion } from "@/features/home/types";

interface FeaturedPortfolioProps {
  promociones: FeaturedPromocion[];
}

/**
 * Featured promociones — image-on-top / white-body cards in an asymmetric grid
 * (1.3fr 1fr 1fr), first card featured spanning 2 rows. Ported from the
 * CoviCanarias `.promo-grid` / `.promo-card` reference.
 */
export function FeaturedPortfolio({ promociones }: FeaturedPortfolioProps) {
  if (promociones.length === 0) {
    return (
      <section
        id="promos"
        className="scroll-mt-[80px] py-section-lg px-6 md:px-[56px] bg-bg-surface-sunken"
        aria-labelledby="portfolio-title"
      >
        <div className="mx-auto max-w-[1200px] text-center">
          <h2
            id="portfolio-title"
            className="mb-4 font-display text-display-md text-fg-default"
          >
            Promociones destacadas
          </h2>
          <p className="font-sans text-body-md text-fg-muted">
            Próximamente estaremos añadiendo nuestras propiedades destacadas.
          </p>
        </div>
      </section>
    );
  }

  const cards = promociones.slice(0, 3);

  return (
    <section
      id="promos"
      className="scroll-mt-[80px] py-section-lg px-6 md:px-[56px] bg-bg-surface-sunken"
      aria-labelledby="portfolio-title"
    >
      <div className="mx-auto max-w-[1200px]">
        {/* ── Header: eyebrow + h2 · secondary CTA ───────────────────────── */}
        <div className="mb-14 flex flex-wrap items-end justify-between gap-10">
          <div>
            <span className="inline-flex items-center gap-3 font-mono text-[11px] font-medium uppercase tracking-[0.22em] text-terracota before:h-px before:w-[32px] before:bg-gradient-to-r before:from-terracota before:to-transparent before:content-['']">
              Promociones activas
            </span>
            <h2
              id="portfolio-title"
              className="mt-[18px] max-w-[620px] font-display text-display-md text-fg-default"
            >
              Casas que están esperando a alguien como tú.
            </h2>
          </div>
          <Link
            href="/portafolio"
            className="group inline-flex items-center gap-[10px] rounded-pill border-[1.5px] border-fg-default px-[26.5px] py-[13.5px] font-sans text-[15px] font-medium tracking-[-0.005em] text-fg-default transition-all duration-deliberate ease-standard hover:bg-fg-default hover:text-bg-canvas"
          >
            Ver las {promociones.length} promociones
            <span className="transition-transform duration-250 group-hover:translate-x-[3px]">
              →
            </span>
          </Link>
        </div>

        {/* ── Asymmetric grid: 1.3fr 1fr 1fr, first card spans 2 rows ─────── */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1.3fr_1fr_1fr]">
          {cards.map((promocion, i) => (
            <PropertyCard key={promocion.id} promocion={promocion} featured={i === 0} />
          ))}
        </div>
      </div>
    </section>
  );
}

interface PropertyCardProps {
  promocion: FeaturedPromocion;
  featured?: boolean;
}

function PropertyCard({ promocion, featured = false }: PropertyCardProps) {
  const {
    name,
    slug,
    municipality,
    island,
    operation,
    propertyType,
    constructionStatus,
    seoDescription,
  } = promocion;

  const propertyLabel = propertyType
    ? PROPERTY_TYPE_LABELS[propertyType as PropertyType]
    : null;
  const operationLabel = operation
    ? OPERATION_TYPE_LABELS[operation as OperationType]
    : null;
  const constructionLabel = constructionStatus
    ? CONSTRUCTION_STATUS_LABELS[constructionStatus as ConstructionStatus]
    : null;
  const badge = constructionLabel ?? operationLabel;

  return (
    <article
      className={`group relative flex flex-col overflow-hidden rounded-[20px] bg-bone shadow-[0_2px_4px_rgba(26,20,16,0.04),0_12px_24px_rgba(26,20,16,0.06),0_24px_48px_rgba(26,20,16,0.04)] transition-[transform,box-shadow] duration-slow ease-standard hover:-translate-y-[6px] hover:shadow-[0_4px_8px_rgba(26,20,16,0.05),0_24px_48px_rgba(26,20,16,0.10),0_48px_96px_rgba(26,20,16,0.06)] focus-within:outline-2 focus-within:outline-focus-ring focus-within:outline-offset-2 ${featured ? "lg:row-span-2" : ""}`}
      aria-label={name}
    >
      {/* Image */}
      <div
        className={`relative overflow-hidden bg-ink ${featured ? "aspect-[4/5] lg:aspect-auto lg:min-h-[380px] lg:flex-1" : "aspect-[4/5]"}`}
      >
        {promocion.coverUrl ? (
          <MediaImage
            src={promocion.coverUrl}
            alt={name}
            fill
            sizes={
              featured
                ? "(min-width: 1024px) 40vw, 100vw"
                : "(min-width: 1024px) 25vw, 100vw"
            }
            className="object-cover object-[center_35%] transition-transform duration-[1400ms] ease-standard group-hover:scale-[1.06]"
          />
        ) : (
          <div className="absolute inset-0 bg-[linear-gradient(135deg,var(--color-ink-2),var(--color-ink))]" />
        )}
        <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(0,0,0,0)_50%,rgba(0,0,0,.5)_100%)]" />

        {/* Badge (top-left) */}
        {badge && (
          <div className="absolute left-4 top-4 z-[2]">
            <span
              className={`inline-flex items-center rounded-pill px-[11px] py-[6px] text-[10.5px] font-bold uppercase tracking-[0.1em] backdrop-blur-[8px] ${featured ? "bg-terracota text-white" : "bg-white/95 text-fg-default"}`}
            >
              {badge}
            </span>
          </div>
        )}
      </div>

      {/* Body */}
      <div className="flex flex-col p-[22px_24px_24px]">
        {/* Location */}
        <div className="mb-[6px] flex items-center gap-[6px] text-[12px] font-medium tracking-[0.04em] text-fg-subtle">
          <svg
            className="h-3 w-3 shrink-0"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            aria-hidden="true"
          >
            <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z" />
            <circle cx="12" cy="10" r="3" />
          </svg>
          {[municipality, island].filter(Boolean).join(", ")}
        </div>

        {/* Name */}
        <h3
          className={`mb-[10px] font-serif font-medium leading-[1.15] tracking-[-0.01em] text-fg-default ${featured ? "text-[30px]" : "text-[24px]"}`}
        >
          {name}
        </h3>

        {/* Description */}
        {seoDescription && (
          <p className="mb-4 line-clamp-2 text-[14px] leading-[1.5] text-fg-subtle">
            {seoDescription}
          </p>
        )}

        {/* Meta row */}
        <div className="mt-auto flex items-center justify-between border-t border-line pt-[14px] text-[13px] text-fg-muted">
          <span>
            {propertyLabel && <strong className="font-semibold text-fg-default">{propertyLabel}</strong>}
          </span>
          {operationLabel && (
            <span>
              <strong className="font-semibold text-fg-default">{operationLabel}</strong>
            </span>
          )}
        </div>
      </div>

      {/* Full-card link */}
      <Link
        href={`/inmuebles/${slug}`}
        className="absolute inset-0 z-10 rounded-[20px] focus-visible:outline-2 focus-visible:outline-focus-ring focus-visible:outline-offset-2"
        aria-label={`Ver detalles de ${name}`}
      >
        <span className="sr-only">Ver detalles de {name}</span>
      </Link>
    </article>
  );
}
