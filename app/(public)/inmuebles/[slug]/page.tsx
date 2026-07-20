import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getPromocionBySlug } from "@/features/detail/server/get-detail-data";
import { getPublicMediaUrl } from "@/infrastructure/media/public-url";
import { buildPageMetadata } from "@/features/seo/server/build-page-metadata";
import { DetailHero } from "@/features/detail/components/DetailHero";
import { InfoBar } from "@/features/detail/components/InfoBar";
import { DetailSection } from "@/features/detail/components/DetailSection";
import { IntroStats } from "@/features/detail/components/IntroStats";
import { BlockDescripcion } from "@/features/detail/components/BlockDescripcion";
import { BlockCalidades } from "@/features/detail/components/BlockCalidades";
import { BlockZonasComunes } from "@/features/detail/components/BlockZonasComunes";
import { BlockUbicacion } from "@/features/detail/components/BlockUbicacion";
import { BlockPlazos } from "@/features/detail/components/BlockPlazos";
import { DetailGallery } from "@/features/detail/components/DetailGallery";
import { TypologyTable } from "@/features/detail/components/TypologyTable";
import { MapPromocion } from "@/features/detail/components/MapPromocion";
import { ProjectInfoTable } from "@/features/detail/components/ProjectInfoTable";
import { PurchaseProcess } from "@/features/detail/components/PurchaseProcess";
import { DetailCTA } from "@/features/detail/components/DetailCTA";
import { ContactForm } from "@/features/engagement/components/ContactForm";
import { WhatsAppButton } from "@/features/engagement/components/WhatsAppButton";
import { RelatedProperties } from "@/features/engagement/components/RelatedProperties";
import { getContactConfig } from "@/features/engagement/server/get-contact-config";
import { buildBreadcrumbJsonLd } from "@/features/seo/server/breadcrumb-json-ld";
import { PROPERTY_TYPE_LABELS } from "@/shared/constants/domain-labels";
import { serializeJsonLd } from "@/shared/utils/seo/json-ld";

// Lee el inmueble (BBDD) en cada request; no se prerenderiza en build (sin DB).
export const dynamic = "force-dynamic";

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

  // Resolve content blocks by type. ZONAS_COMUNES and PLAZOS_GARANTIAS are
  // only meaningful for portfolio (obra nueva) promotions, matching the
  // previous EditorialBlocks gating.
  const isPortfolio = promocion.kind === "portfolio";
  const blockOf = (type: string) =>
    promocion.contentBlocks.find((b) => b.blockType === type) ?? null;
  const descripcionBlock = blockOf("DESCRIPCION_GENERAL");
  const calidadesBlock = blockOf("MEMORIA_CALIDADES");
  const ubicacionBlock = blockOf("UBICACION_SERVICIOS");
  const zonasBlock = isPortfolio ? blockOf("ZONAS_COMUNES") : null;
  const plazosBlock = isPortfolio ? blockOf("PLAZOS_GARANTIAS") : null;

  // Intro heading, e.g. "Casa en Arona" — falls back to the promotion name.
  const propertyTypeLabel =
    promocion.propertyType &&
    PROPERTY_TYPE_LABELS[
      promocion.propertyType as keyof typeof PROPERTY_TYPE_LABELS
    ];
  const introTitle =
    propertyTypeLabel && promocion.municipality
      ? `${propertyTypeLabel} en ${promocion.municipality}`
      : promocion.name;

  const hasGallery = promocion.mediaAssets.some(
    (a) => a.kind === "IMAGE_GALLERY",
  );

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
            __html: serializeJsonLd(structuredData),
          }}
        />
      )}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: serializeJsonLd(breadcrumbJsonLd),
        }}
      />

      <article>
        {/* Hero + primary metrics — stay on Fraunces, like the reference */}
        <DetailHero promocion={promocion} />
        <InfoBar promocion={promocion} />

        {/* Stacked editorial sections use Instrument Serif for display type,
            matching the CoviCanarias detail reference. Scoped via a
            --font-display override so the rest of the site keeps Fraunces. */}
        <div style={{ "--font-display": "var(--font-instrument)" } as React.CSSProperties}>
        {/* 1. Intro + stats */}
        <DetailSection
          bg="cream"
          tag="El inmueble"
          tagVariant="orange"
          title={introTitle}
          subtitle={
            descripcionBlock ? (
              <span className="block [&_[data-block-type]>div]:mx-auto [&_[data-block-type]>div]:max-w-[520px]">
                <BlockDescripcion block={descripcionBlock} />
              </span>
            ) : undefined
          }
        >
          <IntroStats promocion={promocion} />
        </DetailSection>

        {/* 2. Tipologías */}
        {promocion.tipologias.length > 0 && (
          <DetailSection
            bg="white"
            tag="Elige la tuya"
            tagVariant="purple"
            title="Tipos de vivienda"
            subtitle="Modelos disponibles con sus superficies y precios de referencia."
          >
            <TypologyTable promocion={promocion} />
          </DetailSection>
        )}

        {/* 3. Galería — only when the promotion has gallery images */}
        {hasGallery && (
          <DetailSection
            bg="alt"
            tag="Tu futuro hogar"
            tagVariant="orange"
            title="Cómo será tu hogar"
            subtitle="Espacios pensados para el día a día, con luz natural y acabados contemporáneos."
          >
            <DetailGallery promocion={promocion} />
          </DetailSection>
        )}

        {/* 4. Memoria de calidades */}
        {calidadesBlock && (
          <DetailSection
            bg="white"
            tag="Acabados"
            tagVariant="purple"
            title="Memoria de calidades"
            subtitle="Cada elemento elegido con criterio, pensado para durar y acompañar tu día a día."
          >
            <BlockCalidades block={calidadesBlock} />
          </DetailSection>
        )}

        {/* 5. Zonas comunes (portfolio) */}
        {zonasBlock && (
          <DetailSection
            bg="cream"
            tag="Instalaciones"
            tagVariant="orange"
            title="Zonas comunes"
          >
            <BlockZonasComunes block={zonasBlock} />
          </DetailSection>
        )}

        {/* 6. Estado de la obra (portfolio) */}
        {plazosBlock && (
          <DetailSection
            bg="white"
            tag="Avance del proyecto"
            tagVariant="orange"
            title="Plazos y garantías"
          >
            <div className="mx-auto max-w-[720px] rounded-[14px] border border-border-default bg-bg-surface p-8">
              <BlockPlazos block={plazosBlock} />
            </div>
          </DetailSection>
        )}

        {/* 7. Ubicación — map + nearby services */}
        <DetailSection
          bg="cream"
          tag="Entorno"
          tagVariant="orange"
          title="Ubicación"
          subtitle={
            promocion.address ??
            [promocion.municipality, promocion.island]
              .filter(Boolean)
              .join(", ")
          }
        >
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <div className="overflow-hidden rounded-[14px] border border-border-default bg-bg-surface">
              <MapPromocion
                coordinates={mapCoordinates}
                mode={promocion.mapPrivacyMode as "EXACT" | "AREA"}
                name={promocion.name}
              />
            </div>
            {ubicacionBlock && <BlockUbicacion block={ubicacionBlock} />}
          </div>
        </DetailSection>

        {/* 8. Proceso */}
        {(promocion.operation === "SALE" ||
          promocion.operation === "RENT" ||
          promocion.operation === "SALE_AND_RENT") && (
          <DetailSection
            bg="white"
            tag="Cómo funciona"
            tagVariant="purple"
            title={
              promocion.operation === "RENT"
                ? "El proceso de alquiler"
                : "El proceso de compra"
            }
            subtitle="Te acompañamos en cada paso, con transparencia y sin compromiso."
          >
            <PurchaseProcess operation={promocion.operation} />
          </DetailSection>
        )}

        {/* 9. Información del proyecto */}
        <DetailSection
          bg="cream"
          tag="Ficha técnica"
          tagVariant="gold"
          title="Información del inmueble"
        >
          <ProjectInfoTable promocion={promocion} />
        </DetailSection>

        {/* 10. CTA */}
        <DetailSection bg="white">
          <DetailCTA
            promocion={promocion}
            phone={contactConfig.whatsappNumber}
            contactAnchor="contacto"
          />
        </DetailSection>

        {/* 11. Contact form (functional) */}
        <DetailSection
          bg="cream"
          id="contacto"
          tag="Contacto"
          tagVariant="orange"
          title="Solicitar información"
          subtitle="Déjanos tus datos y un agente te responderá lo antes posible."
        >
          <div className="mx-auto max-w-[560px] space-y-6">
            <div className="rounded-[14px] border border-border-default bg-bg-surface p-6 md:p-8">
              <ContactForm
                promocionId={promocion.id}
                tipologias={promocion.tipologias}
              />
            </div>
            <WhatsAppButton
              phoneNumber={contactConfig.whatsappNumber}
              prefilledMessage={contactConfig.whatsappPrefilledMessage}
              promocionName={promocion.name}
            />
          </div>
        </DetailSection>

        {/* Legal disclaimer band */}
        <div className="border-t border-border-subtle bg-bg-surface-sunken px-6 py-8 md:px-12">
          <p className="mx-auto max-w-[1180px] text-center text-[11px] leading-[1.65] text-fg-subtle">
            Las imágenes, infografías y planos son orientativos y pueden estar
            sujetos a modificaciones. Los precios y superficies indicados son
            orientativos y no constituyen oferta contractual. Consulta las
            condiciones concretas con nuestro equipo.
          </p>
        </div>
        </div>

        {/* Related properties */}
        <RelatedProperties
          promocionId={promocion.id}
          location={mapCoordinates}
          municipality={promocion.municipality}
        />
      </article>
    </>
  );
}
