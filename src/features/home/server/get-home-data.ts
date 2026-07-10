import { eq, and } from "drizzle-orm";
import { contentBlocks, promociones } from "@/infrastructure/db/schema";
import { PublicContext } from "@/infrastructure/tenant/PublicContext";
import { CatalogRepository } from "@/infrastructure/db/repositories/catalog.repository";
import { getPublicMediaUrl } from "@/infrastructure/media/public-url";
import type { ContentBlock } from "@/infrastructure/db/schema/content-blocks";
import type {
  FeaturedPromocion,
  HeroPayload,
  HowWeWorkPayload,
  AboutDomioPayload,
  TrustPayload,
  CTAPayload,
  FAQPayload,
  HomePageData,
} from "@/features/home/types";

/**
 * Safely extracts a typed payload from a ContentBlock row.
 */
function extractPayload<T>(block: ContentBlock | undefined, fallback: T): T {
  if (!block) return fallback;
  return (block.payload ?? fallback) as T;
}

// ── Default payloads (fallback when content_blocks are not seeded) ──────

const defaultHero: HeroPayload = {
  claim: "Tu hogar en Canarias empieza aquí",
  lead: "Descubre las mejores propiedades en Tenerife. Venta y alquiler de pisos, áticos, chalets y locales comerciales con el respaldo de Domio.",
  ctaPrimary: "Ver propiedades",
  ctaSecondary: "Contactar",
  // Fallback hero image (same free Unsplash photo the seed sets on the DB block —
  // the hero used on the CoviCanarias final design home).
  backgroundImageId:
    "https://images.unsplash.com/photo-1641579707460-d4242c635c81?q=80&w=2802&auto=format&fit=crop&ixlib=rb-4.1.0",
  trustStats: [
    { value: "15", unit: "años", label: "de experiencia" },
    { value: "500", unit: "inmuebles", label: "gestionados" },
    { value: "10", unit: "ciudades", label: "en Tenerife" },
  ],
};

const defaultComoTrabajamos: HowWeWorkPayload = {
  title: "Cómo trabajamos",
  subtitle: "Nuestro proceso transparente de principio a fin.",
  steps: [
    { numeral: "01", icon: "magnifying-glass", title: "Analizamos", body: "Estudiamos tus necesidades para encontrar la propiedad ideal." },
    { numeral: "02", icon: "house", title: "Visitamos", body: "Te acompañamos a las visitas con asesoramiento personalizado." },
    { numeral: "03", icon: "handshake", title: "Gestionamos", body: "Tramitamos toda la documentación para que no te preocupes." },
    { numeral: "04", icon: "key", title: "Entregamos", body: "Te damos las llaves con total tranquilidad y respaldo legal." },
  ],
};

const defaultAbout: AboutDomioPayload = {
  title: "Quiénes somos",
  subtitle: "Más de 15 años creando hogares en Canarias.",
  imageId:
    "https://images.unsplash.com/photo-1586023492125-27b2c045efd7?q=80&w=2400&auto=format&fit=crop",
  imageAlt: "Salón luminoso de una vivienda gestionada por Domio en Tenerife",
  tagText: "Desde 2010",
  rows: [
    { aspect: "Experiencia", agenciaTradicional: "Variable según el agente", domio: "Equipo con 15+ años en Tenerife" },
    { aspect: "Visibilidad", agenciaTradicional: "Escaparate local limitado", domio: "Catálogo online completo con precios" },
    { aspect: "Honorarios", agenciaTradicional: "Entre 5-8% + IVA", domio: "Transparencia total desde el primer día" },
    { aspect: "Tecnología", agenciaTradicional: "Gestión manual", domio: "Plataforma digital con tours virtuales" },
  ],
};

const defaultTrust: TrustPayload = {
  title: "Confianza",
  subtitle: "Los números hablan por nosotros.",
  metrics: [
    { value: "15", unit: "años", label: "de experiencia en el sector inmobiliario canario" },
    { value: "500", unit: "+", label: "inmuebles gestionados con éxito" },
    { value: "10", unit: "ciudades", label: "presentes en toda Tenerife" },
    { value: "98", unit: "%", label: "de clientes satisfechos" },
  ],
  testimonios: [
    { quote: "Domio hizo que comprar nuestra primera casa fuera sencillo y sin estrés. Su equipo nos guió en cada paso.", author: "María y Carlos", role: "Compradores, Residencial Las Américas" },
    { quote: "Profesionales, cercanos y eficientes. Vendimos nuestro piso en tiempo récord gracias a su asesoramiento.", author: "Ana García", role: "Vendedora, Santa Cruz" },
    { quote: "Buscábamos un local comercial y Domio nos encontró opciones que ni siquiera habíamos considerado. Muy recomendables.", author: "Roberto Díaz", role: "Emprendedor, La Laguna" },
  ],
};

const defaultCTA: CTAPayload = {
  title: "¿Listo para encontrar tu hogar ideal?",
  body: "Déjanos ayudarte a dar el primer paso hacia tu nueva propiedad en Tenerife.",
  ctaLabel: "Solicitar visita",
  ctaHref: "/contacto",
  backgroundImageId:
    "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?q=80&w=2400&auto=format&fit=crop",
};

const defaultFAQ: FAQPayload = {
  title: "Preguntas frecuentes",
  subtitle: "Todo lo que necesitas saber sobre nuestros servicios inmobiliarios.",
  items: [
    { question: "¿Qué tipos de propiedad gestionan?", answer: "Trabajamos con todo tipo de inmuebles: pisos, áticos, chalets, locales comerciales, oficinas y terrenos. Tanto en venta como en alquiler." },
    { question: "¿Cuánto cuesta vender una propiedad con Domio?", answer: "Nuestras tarifas son transparentes y se acuerdan desde el principio. Contacta con nosotros para una valoración personalizada sin compromiso." },
    { question: "¿Ofrecen visitas virtuales?", answer: "Sí, disponemos de tours virtuales y videollamadas para que puedas conocer las propiedades sin desplazarte." },
    { question: "¿Qué documentación necesito para comprar?", answer: "Te guiamos en todo el proceso. Necesitarás DNI/NIE, documento de arras, escritura de compraventa y la documentación bancaria para la hipoteca si la necesitas." },
    { question: "¿Trabajan con hipotecas?", answer: "Colaboramos con las principales entidades bancarias de Canarias para ayudarte a conseguir la mejor financiación." },
    { question: "¿Cuánto tiempo tarda el proceso de compra?", answer: "Desde la firma del documento de arras hasta la escritura, el proceso suele completarse en 30-60 días, dependiendo de la financiación." },
  ],
};

// ── Main data fetcher ──────────────────────────────────────────────────

export async function getHomePageData(): Promise<HomePageData> {
  const ctx = new PublicContext();
  const tenantId = ctx.getTenantId();

  const blocks = await ctx.withTransaction(async (tx) => {
    return tx
      .select()
      .from(contentBlocks)
      .where(and(eq(contentBlocks.tenantId, tenantId), eq(contentBlocks.pageKey, "home")));
  });

  const blockMap = new Map<string, ContentBlock>();
  for (const block of blocks) {
    blockMap.set(block.blockKey, block);
  }

  const portfolioRows = await ctx.withTransaction(async (tx) => {
    return tx
      .select()
      .from(promociones)
      .where(
        and(
          eq(promociones.tenantId, tenantId),
          eq(promociones.kind, "portfolio"),
          eq(promociones.status, "PUBLISHED"),
        ),
      );
  });

  const extras = await new CatalogRepository(ctx).findCardExtras(
    portfolioRows.map((p) => p.id),
  );
  const portfolio: FeaturedPromocion[] = portfolioRows.map((p) => {
    const coverR2Key = extras.get(p.id)?.coverR2Key ?? null;
    return { ...p, coverUrl: coverR2Key ? getPublicMediaUrl(coverR2Key) : null };
  });

  return {
    hero: extractPayload<HeroPayload>(blockMap.get("hero"), defaultHero),
    howWeWork: extractPayload<HowWeWorkPayload>(blockMap.get("como-trabajamos"), defaultComoTrabajamos),
    about: extractPayload<AboutDomioPayload>(blockMap.get("sobre"), defaultAbout),
    trust: extractPayload<TrustPayload>(blockMap.get("confianza"), defaultTrust),
    cta: extractPayload<CTAPayload>(blockMap.get("cta-final"), defaultCTA),
    faq: extractPayload<FAQPayload>(blockMap.get("faq"), defaultFAQ),
    portfolio,
  };
}
