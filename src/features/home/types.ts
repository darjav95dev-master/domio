import type { Promocion } from "@/infrastructure/db/schema/promociones";

// ---------------------------------------------------------------------------
// Home page data — payload shapes from content_blocks + promociones
// ---------------------------------------------------------------------------

export interface HeroPayload {
  claim: string;
  lead: string;
  ctaPrimary: string;
  ctaSecondary: string;
  backgroundImageId: string | null;
  trustStats: TrustStat[];
}

export interface TrustStat {
  value: string;
  unit: string;
  label: string;
}

export interface HowWeWorkStep {
  numeral: string;
  icon: string;
  title: string;
  body: string;
}

export interface HowWeWorkPayload {
  title: string;
  subtitle: string;
  steps: HowWeWorkStep[];
}

export interface AboutDomioPayload {
  title: string;
  subtitle: string;
  imageId: string | null;
  imageAlt: string;
  tagText: string;
  rows: CompareRow[];
}

export interface CompareRow {
  aspect: string;
  agenciaTradicional: string;
  domio: string;
}

export interface TrustPayload {
  title: string;
  subtitle: string;
  metrics: TrustMetric[];
  testimonios: Testimonio[];
}

export interface TrustMetric {
  value: string;
  unit: string;
  label: string;
}

export interface Testimonio {
  quote: string;
  author: string;
  role: string;
}

export interface CTAPayload {
  title: string;
  body: string;
  ctaLabel: string;
  ctaHref: string;
  backgroundImageId: string | null;
}

export interface FAQItem {
  question: string;
  answer: string;
}

export interface FAQPayload {
  title: string;
  subtitle: string;
  items: FAQItem[];
}

export interface HomePageData {
  hero: HeroPayload;
  howWeWork: HowWeWorkPayload;
  about: AboutDomioPayload;
  faq: FAQPayload;
  trust: TrustPayload;
  cta: CTAPayload;
  portfolio: Promocion[];
}
