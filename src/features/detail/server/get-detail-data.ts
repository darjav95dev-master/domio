import type { PromocionDetail } from "@/infrastructure/db/repositories/promocion.repository";

export interface SeoResult {
  title: string;
  description: string;
}

export interface RealEstateListingJsonLd {
  "@context": string;
  "@type": string;
  name: string;
  description: string;
  url: string;
  image?: string[];
  offers?: {
    "@type": string;
    price: number;
    priceCurrency: string;
  };
  floorSize?: {
    "@type": string;
    value: number;
    unitCode: string;
  };
  numberOfBedrooms?: number;
  numberOfBathrooms?: number;
  yearBuilt?: number;
  energyEfficiency?: string;
  address?: {
    "@type": string;
    streetAddress: string | null;
    addressLocality: string | null;
    addressRegion: string | null;
    addressCountry: string;
  };
  geo?: {
    "@type": string;
    latitude: number;
    longitude: number;
  };
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function stripHtml(value: string): string {
  // eslint-disable-next-line sonarjs/slow-regex -- Standard HTML tag stripping, no nested quantifiers
  return value.replace(/<[^>]*>/g, "");
}

// ---------------------------------------------------------------------------
// SEO Fallback (pure function)
// ---------------------------------------------------------------------------

const OPERATION_LABELS: Record<string, string> = {
  SALE: "venta",
  RENT: "alquiler",
  SALE_AND_RENT: "venta y alquiler",
};

const PROPERTY_TYPE_LABELS_FALLBACK: Record<string, string> = {
  piso: "Piso",
  ático: "Ático",
  casa: "Casa",
  chalet: "Chalet",
  dúplex: "Dúplex",
  estudio: "Estudio",
  local: "Local",
  oficina: "Oficina",
  nave: "Nave",
  garaje: "Garaje",
  trastero: "Trastero",
  terreno: "Terreno",
};

const DESCRIPTION_FALLBACK_SUFFIX =
  "Descubre esta increíble propiedad en Domio.";

/**
 * Builds SEO title and description with deterministic fallback.
 *
 * - If `seoTitle` is provided and non-empty, uses it as-is.
 * - Otherwise generates: "{tipo} en {operacion} en {zona} — {n_dormitorios} dormitorios | Domio"
 * - If `seoDescription` is provided and non-empty, uses it as-is.
 * - Otherwise generates a truncated description from `descripcionGeneral` (max ~155 chars),
 *   or a fallback sentence.
 */
export function buildSeoFallback(input: {
  seoTitle: string | null;
  seoDescription: string | null;
  propertyType: string | null;
  operation: string | null;
  municipality: string | null;
  bedrooms: number | null;
  descripcionGeneral: string | null;
}): SeoResult {
  const title =
    input.seoTitle && input.seoTitle.length > 0
      ? input.seoTitle
      : buildFallbackTitle(input);

  const description =
    input.seoDescription && input.seoDescription.length > 0
      ? input.seoDescription
      : buildFallbackDescription(input);

  return { title, description };
}

function buildFallbackTitle(input: {
  propertyType: string | null;
  operation: string | null;
  municipality: string | null;
  bedrooms: number | null;
}): string {
  const tipo =
    input.propertyType && PROPERTY_TYPE_LABELS_FALLBACK[input.propertyType]
      ? PROPERTY_TYPE_LABELS_FALLBACK[input.propertyType]
      : "Inmueble";

  const operacion = input.operation
    ? OPERATION_LABELS[input.operation] ?? "operación"
    : "operación";

  const zona = input.municipality ?? "zona desconocida";

  const dormitoriosPart =
    input.bedrooms != null && input.bedrooms > 0 ? ` — ${input.bedrooms} dormitorios` : "";

  return `${tipo} en ${operacion} en ${zona}${dormitoriosPart} | Domio`;
}

function buildFallbackDescription(input: {
  propertyType: string | null;
  operation: string | null;
  municipality: string | null;
  bedrooms: number | null;
  descripcionGeneral: string | null;
}): string {
  if (
    input.descripcionGeneral &&
    input.descripcionGeneral.length > 0
  ) {
    // Strip HTML tags for description
    const plainText = stripHtml(input.descripcionGeneral).trim();

    // If stripping HTML leaves no text, fall through to fallback
    if (plainText.length > 0) {
      if (plainText.length <= 155) {
        return plainText;
      }

      // Truncate to 155 chars and add ellipsis
      return plainText.slice(0, 155).trimEnd() + "…";
    }
  }

  // Fallback when no description available
  const tipo =
    input.propertyType && PROPERTY_TYPE_LABELS_FALLBACK[input.propertyType]
      ? PROPERTY_TYPE_LABELS_FALLBACK[input.propertyType]
      : "Inmueble";

  const operacion = input.operation
    ? OPERATION_LABELS[input.operation] ?? "operación"
    : "operación";

  const zona = input.municipality ?? "zona desconocida";

  const dormitoriosPart =
    input.bedrooms != null && input.bedrooms > 0 ? ` — ${input.bedrooms} dormitorios` : "";

  return `${tipo} en ${operacion} en ${zona}${dormitoriosPart}. ${DESCRIPTION_FALLBACK_SUFFIX}`;
}

// ---------------------------------------------------------------------------
// Structured Data (JSON-LD) — pure function
// ---------------------------------------------------------------------------

/**
 * Generates schema.org/RealEstateListing JSON-LD from the promotion detail.
 *
 * Returns `null` if the promotion is not PUBLISHED (should not render).
 * Respects `mapPrivacyMode`: if AREA, geo coordinates are NOT included.
 */
export function buildStructuredData(
  detail: PromocionDetail,
): RealEstateListingJsonLd | null {
  if (detail.status !== "PUBLISHED") {
    return null;
  }

  // Extract description from content blocks (DESCRIPCION_GENERAL)
  const descBlock = detail.contentBlocks.find(
    (b) => b.blockType === "DESCRIPCION_GENERAL",
  );
  const description = descBlock?.payload?.text
    ? stripHtml(descBlock.payload.text as string).trim()
    : detail.name;

  // Images from IMAGE_GALLERY media assets
  const images = detail.mediaAssets
    .filter((a) => a.kind === "IMAGE_GALLERY")
    .map((a) => a.r2Key);

  // Price from first tipologia
  const firstTipo = detail.tipologias[0];
  const price = firstTipo?.referencePriceSale ?? firstTipo?.referencePriceRent ?? 0;
  const builtArea = firstTipo?.builtArea ?? firstTipo?.usefulArea ?? undefined;
  const bedrooms = firstTipo?.bedrooms ?? undefined;
  const bathrooms = firstTipo?.bathrooms ?? undefined;
  const yearBuilt = firstTipo?.yearBuilt ?? undefined;
  const energyCert = firstTipo?.energyCert ?? undefined;

  // Geo coordinates — respect mapPrivacyMode
  const geo:
    | { "@type": string; latitude: number; longitude: number }
    | undefined =
    detail.mapPrivacyMode === "EXACT" && detail.location
      ? {
          "@type": "GeoCoordinates",
          latitude: detail.location[1],
          longitude: detail.location[0],
        }
      : undefined;

  return {
    "@context": "https://schema.org",
    "@type": "RealEstateListing",
    name: detail.name,
    description,
    url: `https://domio.com/inmuebles/${detail.slug}`,
    image: images.length > 0 ? images : undefined,
    offers: {
      "@type": "Offer",
      price,
      priceCurrency: "EUR",
    },
    floorSize:
      builtArea != null
        ? { "@type": "QuantitativeValue", value: builtArea, unitCode: "MTK" }
        : undefined,
    numberOfBedrooms: bedrooms,
    numberOfBathrooms: bathrooms,
    yearBuilt,
    energyEfficiency: energyCert ?? undefined,
    address: {
      "@type": "PostalAddress",
      streetAddress: detail.address,
      addressLocality: detail.municipality,
      addressRegion: detail.island,
      addressCountry: "ES",
    },
    ...(geo ? { geo } : {}),
  };
}

// ---------------------------------------------------------------------------
// Main orchestrator
// ---------------------------------------------------------------------------

import { unstable_cache } from "next/cache";
import { PublicContext } from "@/infrastructure/tenant/PublicContext";
import { PromocionRepository } from "@/infrastructure/db/repositories/promocion.repository";
import type { TenantContext } from "@/infrastructure/tenant/TenantContext";

export interface PromocionDetailResult {
  promocion: PromocionDetail;
  seo: SeoResult;
  structuredData: RealEstateListingJsonLd | null;
}

/**
 * Inner data fetching and enrichment (no caching wrapper).
 * Separated so it can be reused by the cached version.
 */
async function fetchPromocionDetail(
  slug: string,
  ctx: TenantContext,
): Promise<PromocionDetailResult | null> {
  const repo = new PromocionRepository(ctx);

  const detail = await repo.findDetailBySlug(slug);

  if (!detail) {
    return null;
  }

  // Extract descripcion_general text for SEO fallback
  const descBlock = detail.contentBlocks.find(
    (b) => b.blockType === "DESCRIPCION_GENERAL",
  );
  const descripcionGeneral = descBlock?.payload?.text as string | undefined;

  // Calculate aggregate bedrooms across all tipologias
  const maxBedrooms = detail.tipologias.reduce(
    (max, t) => Math.max(max, t.bedrooms ?? 0),
    0,
  );

  const seo = buildSeoFallback({
    seoTitle: detail.seoTitle,
    seoDescription: detail.seoDescription,
    propertyType: detail.propertyType,
    operation: detail.operation,
    municipality: detail.municipality,
    bedrooms: maxBedrooms > 0 ? maxBedrooms : null,
    descripcionGeneral: descripcionGeneral ?? null,
  });

  const structuredData = buildStructuredData(detail);

  return {
    promocion: detail,
    seo,
    structuredData,
  };
}

/**
 * Fetches the complete detail data for a promotion by slug.
 *
 * - Uses PublicContext (ensures status='PUBLISHED' by RLS + resolveFilters).
 * - Returns null if promotion is not found or not visible (404).
 * - Includes tipologías, unidades, content blocks, media assets.
 * - Applies SEO fallback.
 * - Generates structured data JSON-LD.
 * - ISR: data is cached with tags `promocion:{slug}` and `catalog` so that
 *   the backoffice API (PATCH/DELETE on `/api/internal/promociones/[id]`)
 *   can purge it via `revalidateTag`.
 */
export async function getPromocionBySlug(
  slug: string,
  ctx?: TenantContext,
): Promise<PromocionDetailResult | null> {
  const context = ctx ?? new PublicContext();

  const getCached = unstable_cache(
    async (s: string) => fetchPromocionDetail(s, context),
    [`promocion-detail-${slug}`],
    { tags: [`promocion:${slug}`, "catalog"] },
  );

  return getCached(slug);
}
