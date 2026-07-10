import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getPromocionBySlug } from "@/features/detail/server/get-detail-data";
import { getPublicMediaUrl } from "@/infrastructure/media/public-url";
import { buildPageMetadata } from "@/features/seo/server/build-page-metadata";
import { DetailHero } from "@/features/detail/components/DetailHero";
import { InfoBar } from "@/features/detail/components/InfoBar";
import { EditorialBlocks } from "@/features/detail/components/EditorialBlocks";
import { TypologyTable } from "@/features/detail/components/TypologyTable";
import { MapPromocion } from "@/features/detail/components/MapPromocion";
import { ContactForm } from "@/features/engagement/components/ContactForm";
import { WhatsAppButton } from "@/features/engagement/components/WhatsAppButton";
import { ShareButton } from "@/features/engagement/components/ShareButton";
import { FavoriteButton } from "@/features/favorites/FavoriteButton";
import { RelatedProperties } from "@/features/engagement/components/RelatedProperties";
import { getContactConfig } from "@/features/engagement/server/get-contact-config";
import { buildBreadcrumbJsonLd } from "@/features/seo/server/breadcrumb-json-ld";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface DetailPageProps {
  params: Promise<{ slug: string }>;
}

// ---------------------------------------------------------------------------
// generateMetadata — SEO title, description, OG, Twitter Cards, canonical
// ---------------------------------------------------------------------------

export async function generateMetadata({
  params,
}: DetailPageProps): Promise<Metadata> {
  const { slug } = await params;
  const result = await getPromocionBySlug(slug);

  if (!result) {
    return {};
  }

  const { promocion, seo } = result;

  // Get cover image for OG/Twitter (or leave undefined so buildPageMetadata
  // resolves the tenant default OG image)
  const coverAsset = promocion.mediaAssets.find(
    (a) => a.kind === "IMAGE_GALLERY" && a.isCover,
  ) ?? promocion.mediaAssets.find((a) => a.kind === "IMAGE_GALLERY");

  // OG images must be absolute. Local public assets resolve to "/x.jpg" —
  // prefix the site URL so social crawlers can fetch them.
  const coverPublicUrl = coverAsset
    ? getPublicMediaUrl(coverAsset.r2Key)
    : undefined;
  const coverUrl = coverPublicUrl?.startsWith("/")
    ? `${(process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000").replace(/\/$/, "")}${coverPublicUrl}`
    : coverPublicUrl;

  return buildPageMetadata({
    title: seo.title,
    description: seo.description,
    path: `/inmuebles/${promocion.slug}`,
    ogImage: coverUrl,
  });
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default async function DetailPage({ params }: DetailPageProps) {
  const { slug } = await params;
  const result = await getPromocionBySlug(slug);

  if (!result) {
    notFound();
  }

  const { promocion, structuredData } = result;

  // Compute map coordinates respecting privacy mode.
  // sanitizeForClient already overwrites `location` with `locationApprox`
  // in AREA mode, but we derive explicitly here for clarity and defense-in-depth.
  const mapCoordinates: [number, number] =
    promocion.mapPrivacyMode === "EXACT"
      ? promocion.location
      : promocion.locationApprox;

  // Fetch contact config for WhatsApp
  const contactConfig = await getContactConfig();

  // Build BreadcrumbList JSON-LD
  const breadcrumbJsonLd = buildBreadcrumbJsonLd({
    name: promocion.name,
    slug: promocion.slug,
  });

  return (
    <>
      {/* JSON-LD Structured Data */}
      {structuredData && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(structuredData),
          }}
        />
      )}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(breadcrumbJsonLd),
        }}
      />

      <article>
        {/* Detail Hero — 520px fixed height */}
        <DetailHero promocion={promocion} />

        {/* InfoBar — 4-column metric grid */}
        <InfoBar promocion={promocion} />

        {/* Body: Editorial blocks + Typology table + Map */}
        <div className="bg-bg-surface-sunken">
          <div className="mx-auto max-w-[1280px] px-6 py-section-md md:px-10 md:py-section-lg">
            <div className="grid grid-cols-1 gap-12 lg:grid-cols-[1.6fr_1fr]">
              {/* Main content column */}
              <div className="space-y-section-md">
                {/* Editorial blocks */}
                <EditorialBlocks promocion={promocion} />

                {/* Typology table */}
                <section>
                  <div className="mb-6">
                    <p className="relative mb-3 pl-10 font-mono text-[11px] font-medium uppercase tracking-[0.22em] text-accent-default before:absolute before:left-0 before:top-1/2 before:h-px before:w-8 before:-translate-y-1/2 before:bg-[linear-gradient(90deg,var(--accent-default),transparent)]">
                      Tipologías
                    </p>
                    <h2 className="font-display text-[clamp(28px,3.2vw,40px)] font-normal tracking-[-0.035em] leading-[1.05] text-fg-default">
                      Tipos de vivienda
                    </h2>
                  </div>
                  <TypologyTable promocion={promocion} />
                </section>

                {/* Map — only minimal props to Client Component */}
                <section>
                  <div className="mb-6">
                    <p className="relative mb-3 pl-10 font-mono text-[11px] font-medium uppercase tracking-[0.22em] text-accent-default before:absolute before:left-0 before:top-1/2 before:h-px before:w-8 before:-translate-y-1/2 before:bg-[linear-gradient(90deg,var(--accent-default),transparent)]">
                      Ubicación
                    </p>
                    <h2 className="font-display text-[clamp(28px,3.2vw,40px)] font-normal tracking-[-0.035em] leading-[1.05] text-fg-default">
                      Mapa
                    </h2>
                  </div>
                  <MapPromocion
                    coordinates={mapCoordinates}
                    mode={promocion.mapPrivacyMode as "EXACT" | "AREA"}
                    name={promocion.name}
                  />
                </section>
              </div>

              {/* Sticky aside column — ContactForm + action buttons */}
              <aside className="lg:sticky lg:top-24 lg:self-start">
                <div className="space-y-6">
                  {/* Property info summary */}
                  <div className="rounded-surface border border-border-default bg-bg-surface p-6 md:p-8">
                    <p className="font-display text-[21px] font-medium tracking-[-0.015em] text-fg-default">
                      {promocion.name}
                    </p>
                    {promocion.municipality && (
                      <p className="mt-2 font-mono text-[11px] tracking-[0.04em] tabular-nums text-fg-subtle">
                        {promocion.municipality}
                        {promocion.island ? `, ${promocion.island}` : ""}
                      </p>
                    )}
                  </div>

                  {/* Contact form */}
                  <div className="rounded-surface border border-border-default bg-bg-surface p-6 md:p-8">
                    <h3 className="mb-5 font-display text-[21px] font-medium tracking-[-0.015em] text-fg-default">
                      Solicitar información
                    </h3>
                    <ContactForm
                      promocionId={promocion.id}
                      tipologias={promocion.tipologias}
                    />
                  </div>

                  {/* WhatsApp + Share buttons */}
                  <div className="flex flex-col gap-3">
                    <WhatsAppButton
                      phoneNumber={contactConfig.whatsappNumber}
                      prefilledMessage={contactConfig.whatsappPrefilledMessage}
                      promocionName={promocion.name}
                    />
                    <div className="flex items-center gap-3">
                      <ShareButton />
                      <FavoriteButton id={promocion.id} name={promocion.name} />
                    </div>
                  </div>
                </div>
              </aside>
            </div>
          </div>
        </div>

        {/* Related Properties — at the bottom */}
        <RelatedProperties
          promocionId={promocion.id}
          location={mapCoordinates}
          municipality={promocion.municipality}
        />
      </article>
    </>
  );
}
