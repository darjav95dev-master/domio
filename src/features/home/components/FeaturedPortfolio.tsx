import { MediaImage } from "@/shared/components/media-image";
import type { FeaturedPromocion } from "@/features/home/types";

interface FeaturedPortfolioProps {
  promociones: FeaturedPromocion[];
}

/**
 * Renders up to 3 portfolio cards in an asymmetric grid:
 * First card (featured) spans 2 rows.
 * Cards 2 and 3 sit to the right.
 * If less than 3, fills available space gracefully.
 */
export function FeaturedPortfolio({ promociones }: FeaturedPortfolioProps) {
  if (promociones.length === 0) {
    return (
      <section className="py-section-lg px-gutter" aria-labelledby="portfolio-title">
        <div className="max-w-7xl mx-auto text-center">
          <h2 id="portfolio-title" className="font-display text-display-md text-fg-default mb-4">
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
    <section className="py-section-lg px-gutter" aria-labelledby="portfolio-title">
      <div className="max-w-7xl mx-auto">
        {/* Section header */}
        <div className="mb-12">
          <span className="font-mono text-[13px] uppercase tracking-[0.18em] text-accent-default relative pl-6 before:content-[''] before:absolute before:left-0 before:top-1/2 before:-translate-y-1/2 before:w-[20px] before:h-[2px] before:bg-gradient-to-r before:from-accent-default before:to-transparent">
            Promociones
          </span>
          <h2
            id="portfolio-title"
            className="font-display text-display-md text-fg-default mt-4"
          >
            Promociones destacadas
          </h2>
        </div>

        {/* Asymmetric grid: 1.3fr 1fr 1fr, first card spans 2 rows */}
        <div className="grid grid-cols-1 lg:grid-cols-[1.3fr_1fr_1fr] gap-6">
          {/* Featured card (first) — guaranteed to exist because we check length above */}
          {cards[0] && (
            <PropertyCard
              promocion={cards[0]}
              featured
            />
          )}

          {/* Card 2 */}
          {cards[1] && (
            <PropertyCard promocion={cards[1]} />
          )}

          {/* Card 3 */}
          {cards[2] && (
            <PropertyCard promocion={cards[2]} />
          )}
        </div>
      </div>
    </section>
  );
}

interface PropertyCardProps {
  promocion: FeaturedPromocion;
  featured?: boolean;
}

function operationLabel(op: string | null): string {
  if (op === "SALE") return "Venta";
  if (op === "RENT") return "Alquiler";
  return op ?? "";
}

function PropertyCard({ promocion, featured = false }: PropertyCardProps) {
  const { name, municipality, island, operation, propertyType } = promocion;

  return (
    <article
      className={`group relative rounded-[12px] overflow-hidden bg-bg-surface-sunken transition-all duration-deliberate ease-standard hover:-translate-y-1 hover:shadow-[0_12px_32px_rgba(var(--shadow-tint),0.12)] focus-within:outline-2 focus-within:outline-focus-ring focus-within:outline-offset-2 ${featured ? 'lg:row-span-2' : ''}`}
      aria-label={name}
    >
      {/* Image */}
      <div className={`relative w-full ${featured ? 'aspect-[4/3] lg:h-[520px]' : 'aspect-[4/3]'}`}>
        {promocion.coverUrl ? (
          <MediaImage
            src={promocion.coverUrl}
            alt={name}
            fill
            sizes={featured ? "(min-width: 1024px) 40vw, 100vw" : "(min-width: 1024px) 25vw, 100vw"}
            className="object-cover"
          />
        ) : (
          <div className="absolute inset-0 bg-[linear-gradient(135deg,var(--color-ink-2),var(--color-ink))]" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
      </div>

      {/* Content overlay */}
      <div className={`absolute bottom-0 left-0 right-0 p-6 ${featured ? 'lg:p-8' : ''}`}>
        {/* Tags */}
        <div className="flex flex-wrap gap-2 mb-3">
          {operation && (
            <span className="px-3 py-1 rounded-pill bg-bone/90 backdrop-blur-[4px] text-fg-default text-[12px] font-mono uppercase tracking-[0.08em]">
              {operationLabel(operation)}
            </span>
          )}
          {propertyType && (
            <span className="px-3 py-1 rounded-pill bg-bone/90 backdrop-blur-[4px] text-fg-default text-[12px] font-mono uppercase tracking-[0.08em]">
              {propertyType}
            </span>
          )}
        </div>

        {/* Name */}
        <h3 className="font-display text-white text-[22px] leading-tight mb-1">
          {name}
        </h3>

        {/* Location */}
        <p className="font-sans text-[15px] text-white/70">
          {municipality}, {island}
        </p>

        {/* Link (invisible, covers entire card) */}
        <a
          href={`/inmuebles/${promocion.slug}`}
          className="absolute inset-0 z-10 focus-visible:outline-2 focus-visible:outline-focus-ring focus-visible:outline-offset-2 rounded-[12px]"
          aria-label={`Ver detalles de ${name}`}
        >
          <span className="sr-only">Ver detalles de {name}</span>
        </a>
      </div>
    </article>
  );
}
