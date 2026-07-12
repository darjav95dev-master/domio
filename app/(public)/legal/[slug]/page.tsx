import type { Metadata } from "next";
import { notFound } from "next/navigation";
import {
  getLegalPage,
  isLegalSlug,
} from "@/features/contenidos/server/get-legal-page";
import { buildPageMetadata } from "@/features/seo/server/build-page-metadata";

export const dynamic = "force-dynamic";

interface PageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  if (!isLegalSlug(slug)) return {};
  const page = await getLegalPage(slug);
  const title = page?.titulo ?? "Información legal";
  return buildPageMetadata({
    title: `${title} | Domio`,
    description: `${title} de Domio, inmobiliaria en Canarias.`,
    path: `/legal/${slug}`,
  });
}

export default async function LegalPage({ params }: PageProps) {
  const { slug } = await params;
  if (!isLegalSlug(slug)) notFound();

  const page = await getLegalPage(slug);
  if (!page) notFound();

  return (
    <div className="min-h-screen">
      {/* Header band (centered, paper-2) */}
      <section className="bg-bg-surface-sunken pb-16 pt-[104px]">
        <div className="mx-auto max-w-[820px] px-6 text-center md:px-12">
          <span className="inline-flex items-center gap-3 font-mono text-[11px] font-medium uppercase tracking-[0.22em] text-terracota before:h-px before:w-[32px] before:bg-gradient-to-r before:from-terracota before:to-transparent before:content-['']">
            Legal
          </span>
          <h1 className="mx-auto mt-5 font-display text-[clamp(34px,4.6vw,58px)] font-normal leading-[1.05] tracking-[-0.035em] text-fg-default">
            {page.titulo}
          </h1>
        </div>
      </section>

      {/* Content */}
      <section className="bg-bg-canvas pb-24 pt-14">
        <div className="mx-auto max-w-[820px] px-6 md:px-12">
          <div className="flex flex-col gap-10">
            {page.secciones.map((section, i) => (
              <article key={i}>
                <h2 className="font-display text-[22px] font-medium leading-[1.25] tracking-[-0.015em] text-fg-default">
                  {section.titulo}
                </h2>
                <p className="mt-3 font-sans text-[16px] leading-[1.75] text-fg-muted">
                  {section.contenido}
                </p>
              </article>
            ))}
          </div>

          <p className="mt-16 border-t border-border-subtle pt-6 font-mono text-[11px] uppercase tracking-[0.16em] text-fg-subtle">
            Última actualización · {new Date().getFullYear()}
          </p>
        </div>
      </section>
    </div>
  );
}
