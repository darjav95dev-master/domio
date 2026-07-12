import type { Metadata } from "next";
import { getHomePageData } from "@/features/home/server/get-home-data";
import { Hero } from "@/features/home/components/Hero";
import { HowWeWork } from "@/features/home/components/HowWeWork";
import { AboutDomio } from "@/features/home/components/AboutDomio";
import { FeaturedPortfolio } from "@/features/home/components/FeaturedPortfolio";
import { Trust } from "@/features/home/components/Trust";
import { CTA } from "@/features/home/components/CTA";
import { FAQ } from "@/features/home/components/FAQ";
import { RevealWrapper } from "@/features/home/components/RevealWrapper";
import { buildPageMetadata } from "@/features/seo/server/build-page-metadata";
import { buildOrganizationJsonLd } from "@/features/seo/server/organization-json-ld";
import { getOrganizationData } from "@/features/seo/server/get-organization-data";
import { DEFAULT_META } from "@/shared/utils/seo/constants";

export const dynamic = "force-dynamic";

// ---------------------------------------------------------------------------
// Metadata
// ---------------------------------------------------------------------------

export async function generateMetadata(): Promise<Metadata> {
  return buildPageMetadata({
    title: "Domio — Comercialización inmobiliaria en Canarias",
    description: DEFAULT_META.SITE_DESCRIPTION,
    path: "/",
    ogType: "website",
  });
}

/**
 * Home page — SSR with 7 editorial blocks.
 * Nav and Footer are provided by app/(public)/layout.tsx.
 */
export default async function HomePage() {
  const data = await getHomePageData();

  // Fetch Organization JSON-LD data from tenant + contact config
  const { tenant, contact } = await getOrganizationData();
  const organizationJsonLd = buildOrganizationJsonLd({
    name: tenant?.name ?? "Domio",
    config: tenant?.config ?? null,
    contactConfig: contact ?? null,
  });

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(organizationJsonLd),
        }}
      />
      <RevealWrapper>
      <div data-reveal>
        <Hero data={data.hero} />
      </div>
      <div data-reveal>
        <HowWeWork data={data.howWeWork} />
      </div>
      <div data-reveal>
        <AboutDomio data={data.about} />
      </div>
      <div data-reveal>
        <FeaturedPortfolio promociones={data.portfolio} totalCatalogCount={data.totalCatalogCount} />
      </div>
      <div data-reveal>
        <Trust data={data.trust} />
      </div>
      <div data-reveal>
        <CTA data={data.cta} />
      </div>
      <div data-reveal>
        <FAQ data={data.faq} />
      </div>
    </RevealWrapper>
    </>
  );
}
