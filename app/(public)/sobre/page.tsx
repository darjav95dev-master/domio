import type { Metadata } from "next";
import { getSobrePageData } from "@/features/contact/server/get-contact-data";
import { buildPageMetadata } from "@/features/seo/server/build-page-metadata";

export const dynamic = "force-dynamic";

// ---------------------------------------------------------------------------
// Metadata
// ---------------------------------------------------------------------------

export async function generateMetadata(): Promise<Metadata> {
  return buildPageMetadata({
    title: "Sobre Domio | Domio",
    description:
      "Conoce Domio, nuestra historia y nuestro equipo. Más de 15 años de experiencia en el sector inmobiliario de Canarias.",
    path: "/sobre",
  });
}

/**
 * SobrePage — /sobre
 *
 * Editorial layout with content from content_blocks (page_key='sobre').
 * Hero block: titulo + lead.
 * Cuerpo block: array of parrafos.
 *
 * Nav and Footer are provided by app/(public)/layout.tsx.
 */
export default async function SobrePage() {
  const data = await getSobrePageData();

  const titulo = data.hero?.titulo ?? "Sobre Domio";
  const lead =
    data.hero?.lead ??
    "Conoce nuestra historia, nuestros valores y el equipo que hace posible Domio.";
  const tieneCuerpo = data.cuerpo !== null;
  const parrafos = data.cuerpo?.parrafos ?? [];

  return (
    <>
      {/* Hero */}
      <section className="bg-bg-surface-sunken px-6 pt-[140px] pb-24">
        <div className="mx-auto max-w-[760px] text-center">
          <p className="relative font-mono text-[11px] font-medium uppercase tracking-[0.22em] text-accent-default">
            <span
              className="absolute -top-8 left-1/2 block h-px w-8 -translate-x-1/2"
              style={{
                background:
                  "linear-gradient(90deg, var(--accent-default), transparent)",
              }}
              aria-hidden="true"
            />
            Domio
          </p>
          <h1 className="mt-8 font-display text-[clamp(36px,4.8vw,64px)] font-normal leading-[1.05] tracking-[-0.035em] text-fg-default">
            {titulo}
          </h1>
          <p className="mx-auto mt-6 max-w-[52ch] font-sans text-[19px] leading-[1.6] text-fg-muted">
            {lead}
          </p>
        </div>
      </section>

      {/* Editorial body */}
      <section className="bg-bg-canvas px-6 py-20">
        <div className="mx-auto max-w-[760px]">
          {tieneCuerpo ? (
            <>
              {/* Architectural photograph (decorative only) */}
              <div className="mb-16 overflow-hidden rounded-surface bg-gradient-to-br from-ink-soft to-fg-default">
                <div
                  className="aspect-[16/9] w-full bg-cover bg-center"
                  style={{
                    backgroundImage:
                      "linear-gradient(135deg, rgba(44,33,26,.6), rgba(26,20,16,.8))",
                    opacity: 0.85,
                  }}
                  aria-hidden="true"
                />
              </div>

              {/* Content */}
              <div className="space-y-6">
                {parrafos.map((texto, i) => (
                  <p
                    key={i}
                    className="font-sans text-base leading-[1.55] text-fg-muted [&:first-child]:text-[19px] [&:first-child]:leading-[1.6]"
                  >
                    {texto}
                  </p>
                ))}
              </div>

              {/* Signature block */}
              <div className="mt-16 border-t border-border-default pt-10">
                <p className="font-display italic text-[21px] leading-[1.45] tracking-[-0.01em] text-fg-default">
                  En Domio, cada propiedad cuenta una historia.
                </p>
                <p className="mt-4 font-mono text-[11px] tracking-[0.04em] text-fg-subtle tabular-nums">
                  Domio · Santa Cruz de Tenerife ·{" "}
                  {new Date().getFullYear()}
                </p>
              </div>
            </>
          ) : (
            <div className="rounded-surface border border-border-default bg-bg-surface px-6 py-16 text-center">
              <p className="font-sans text-base text-fg-default">
                El equipo editorial aún no ha publicado el contenido de esta
                página
              </p>
            </div>
          )}
        </div>
      </section>
    </>
  );
}
