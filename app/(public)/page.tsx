import { getHomePageData } from "@/features/home/server/get-home-data";
import { Hero } from "@/features/home/components/Hero";
import { HowWeWork } from "@/features/home/components/HowWeWork";
import { AboutDomio } from "@/features/home/components/AboutDomio";
import { FeaturedPortfolio } from "@/features/home/components/FeaturedPortfolio";
import { Trust } from "@/features/home/components/Trust";
import { CTA } from "@/features/home/components/CTA";
import { FAQ } from "@/features/home/components/FAQ";
import { RevealWrapper } from "@/features/home/components/RevealWrapper";

export const dynamic = "force-dynamic";

/**
 * Home page — SSR with 7 editorial blocks.
 * Nav and Footer are provided by app/(public)/layout.tsx.
 */
export default async function HomePage() {
  const data = await getHomePageData();

  return (
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
        <FeaturedPortfolio promociones={data.portfolio} />
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
  );
}
