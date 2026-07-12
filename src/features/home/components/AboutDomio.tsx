import { MediaImage } from "@/shared/components/media-image";
import type { AboutDomioPayload } from "@/features/home/types";

interface AboutDomioProps {
  data: AboutDomioPayload;
}

/**
 * Image "fact" callout — static editorial copy ported from the CoviCanarias
 * reference (the "−20%" overlay) and adapted to a real-estate agency.
 * ponytail: hardcoded; promote to the payload only if it needs to be editable.
 */
const FACT_NUM = "98%";
const FACT_TEXT =
  "de nuestros clientes nos recomiendan. Acompañamiento cercano, de la primera visita a la firma.";

export function AboutDomio({ data }: AboutDomioProps) {
  const { title, subtitle, imageId, imageAlt, tagText, rows } = data;

  return (
    <section className="py-section-lg px-6 md:px-[56px]" aria-labelledby="about-title">
      <div className="mx-auto grid max-w-[1200px] grid-cols-1 items-center gap-12 lg:grid-cols-[1fr_1.05fr] lg:gap-[96px]">
        {/* ── Left: architectural photograph with tag + fact callout ───────── */}
        <div className="group relative aspect-[4/5] overflow-hidden rounded-[20px] shadow-[0_4px_8px_rgba(26,20,16,.05),0_24px_48px_rgba(26,20,16,.10),0_48px_96px_rgba(26,20,16,.06)]">
          {imageId ? (
            <MediaImage
              alt={imageAlt}
              src={imageId}
              fill
              className="object-cover transition-transform duration-[1600ms] ease-standard group-hover:scale-[1.04]"
            />
          ) : (
            <div className="absolute inset-0 bg-[linear-gradient(135deg,var(--color-ink-2),var(--color-ink))]" />
          )}

          {/* Top-left category tag */}
          {tagText && (
            <span className="absolute left-6 top-6 rounded-pill bg-[rgba(255,252,247,0.95)] px-[14px] py-2 font-mono text-[10px] font-medium uppercase tracking-[0.16em] text-fg-default backdrop-blur-[8px]">
              {tagText}
            </span>
          )}

          {/* Bottom fact callout */}
          <div className="absolute inset-x-6 bottom-6 flex items-center gap-5 rounded-[12px] border border-white/[0.08] bg-[rgba(26,20,16,0.78)] p-[24px_26px] [backdrop-filter:blur(20px)_saturate(140%)]">
            <span className="font-serif text-[48px] font-normal leading-[0.95] tracking-[-0.035em] text-warm-amber">
              {FACT_NUM}
            </span>
            <span className="text-[13px] leading-[1.45] text-white/[0.82]">
              {FACT_TEXT}
            </span>
          </div>
        </div>

        {/* ── Right: header + 2-column compare ─────────────────────────────── */}
        <div>
          <span className="inline-flex items-center gap-3 font-mono text-[11px] font-medium uppercase tracking-[0.22em] text-terracota before:h-px before:w-[32px] before:bg-gradient-to-r before:from-terracota before:to-transparent before:content-['']">
            Por qué Domio
          </span>
          <h2
            id="about-title"
            className="mt-5 font-display text-display-md text-fg-default"
          >
            {title}
          </h2>
          {subtitle && (
            <p className="mt-5 font-sans text-[19px] leading-[1.6] text-fg-muted max-w-[52ch]">
              {subtitle}
            </p>
          )}

          {/* Compare: two lists (— vs ✓) */}
          <div className="mt-10 grid grid-cols-1 overflow-hidden rounded-[12px] shadow-[inset_0_0_0_1px_var(--border-default)] md:grid-cols-2">
            <div className="bg-bg-surface-sunken p-[32px_28px]">
              <div className="mb-[22px] font-mono text-[10px] font-medium uppercase tracking-[0.18em] text-fg-subtle">
                Otras agencias
              </div>
              <ul className="flex flex-col gap-[14px]">
                {rows.map((row, i) => (
                  <li
                    key={i}
                    className="flex gap-3 text-[14px] leading-[1.5] text-fg-muted before:shrink-0 before:font-medium before:text-fg-subtle before:content-['—']"
                  >
                    {row.agenciaTradicional}
                  </li>
                ))}
              </ul>
            </div>

            <div className="relative bg-bone p-[32px_28px] before:absolute before:inset-x-0 before:top-0 before:h-[2px] before:bg-gradient-to-r before:from-terracota before:to-terracota-deep before:content-['']">
              <div className="mb-[22px] font-mono text-[10px] font-medium uppercase tracking-[0.18em] text-terracota">
                Domio
              </div>
              <ul className="flex flex-col gap-[14px]">
                {rows.map((row, i) => (
                  <li
                    key={i}
                    className="flex gap-3 text-[14px] leading-[1.5] text-fg-muted before:shrink-0 before:font-semibold before:text-fg-default before:content-['✓']"
                  >
                    {row.domio}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
