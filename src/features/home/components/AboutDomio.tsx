import { MediaImage } from "@/shared/components/media-image";
import type { AboutDomioPayload } from "@/features/home/types";

interface AboutDomioProps {
  data: AboutDomioPayload;
}

export function AboutDomio({ data }: AboutDomioProps) {
  const { title, subtitle, imageId, imageAlt, tagText, rows } = data;

  return (
    <section className="py-section-lg px-6 md:px-[56px]" aria-labelledby="about-title">
      <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-[1fr_1.05fr] gap-12 lg:gap-16 items-start">
        {/* ── Left: architectural photograph ──────────────────────────────── */}
        <div className="relative aspect-[4/5] rounded-[20px] overflow-hidden">
          {imageId ? (
            <MediaImage
              alt={imageAlt}
              src={imageId}
              fill
              className="object-cover"
            />
          ) : (
            <div className="absolute inset-0 bg-[linear-gradient(135deg,var(--color-ink-2),var(--color-ink))]" />
          )}
          {/* Bottom-left tag overlay */}
          {tagText && (
            <div className="absolute bottom-4 left-4 px-5 py-3 rounded-pill bg-bone/90 backdrop-blur-[6px] text-fg-default text-sm font-medium">
              {tagText}
            </div>
          )}
        </div>

        {/* ── Right: compare table ──────────────────────────────────────── */}
        <div>
          {/* Section header */}
          <span className="font-mono text-[13px] uppercase tracking-[0.18em] text-accent-default relative pl-6 before:content-[''] before:absolute before:left-0 before:top-1/2 before:-translate-y-1/2 before:w-[20px] before:h-[2px] before:bg-gradient-to-r before:from-accent-default before:to-transparent">
            Sobre nosotros
          </span>
          <h2
            id="about-title"
            className="font-display text-display-md text-fg-default mt-4 mb-4"
          >
            {title}
          </h2>
          {subtitle && (
            <p className="font-sans text-body-md text-fg-muted max-w-[65ch] mb-10">
              {subtitle}
            </p>
          )}

          {/* Compare table */}
          <div className="overflow-hidden rounded-[12px] border border-border-default">
            {/* Header row */}
            <div className="grid grid-cols-[1fr_1fr_1fr] bg-bg-surface-sunken border-b border-border-default">
              <div className="px-5 py-4 font-mono text-[12px] uppercase tracking-[0.1em] text-fg-subtle">
                Aspecto
              </div>
              <div className="px-5 py-4 font-mono text-[12px] uppercase tracking-[0.1em] text-fg-subtle">
                Agencia tradicional
              </div>
              <div className="px-5 py-4 font-mono text-[12px] uppercase tracking-[0.1em] text-accent-default border-t-2 border-accent-default">
                Domio
              </div>
            </div>

            {/* Data rows */}
            {rows.map((row, i) => (
              <div
                key={i}
                className="grid grid-cols-[1fr_1fr_1fr] border-b border-border-default last:border-b-0"
              >
                <div className="px-5 py-4 font-mono text-[13px] text-fg-default font-medium">
                  {row.aspect}
                </div>
                <div className="px-5 py-4 font-sans text-[15px] text-fg-muted">
                  {row.agenciaTradicional}
                </div>
                <div className="px-5 py-4 font-sans text-[15px] text-fg-default font-medium">
                  {row.domio}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
