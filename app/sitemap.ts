import type { MetadataRoute } from "next";
import { buildSitemapUrls } from "@/features/seo/server/sitemap-urls";
import { CatalogRepository } from "@/infrastructure/db/repositories/catalog.repository";
import { PublicContext } from "@/infrastructure/tenant/PublicContext";
import { getSiteUrl } from "@/shared/utils/seo/site-url";
import {
  SITEMAP_CHANGE_FREQ,
  SITEMAP_PRIORITY,
} from "@/shared/utils/seo/constants";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const siteUrl = getSiteUrl();

  // Static pages: home, portafolio, contacto, sobre — no lastModified
  // (Google penalizes "today" dates on unchanged pages)
  const staticEntries: MetadataRoute.Sitemap = [
    {
      url: siteUrl,
      changeFrequency: SITEMAP_CHANGE_FREQ.STATIC,
      priority: SITEMAP_PRIORITY.HOME,
    },
    {
      url: `${siteUrl}/portafolio`,
      changeFrequency: SITEMAP_CHANGE_FREQ.PORTFOLIO,
      priority: SITEMAP_PRIORITY.PORTFOLIO,
    },
    {
      url: `${siteUrl}/contacto`,
      changeFrequency: SITEMAP_CHANGE_FREQ.STATIC,
      priority: SITEMAP_PRIORITY.STATIC_PAGES,
    },
    {
      url: `${siteUrl}/sobre`,
      changeFrequency: SITEMAP_CHANGE_FREQ.STATIC,
      priority: SITEMAP_PRIORITY.STATIC_PAGES,
    },
  ];

  // Dynamic promotion detail pages (published only, via PublicContext)
  const repo = new CatalogRepository(new PublicContext());
  const promoEntries = await buildSitemapUrls(repo);

  // Convert SitemapEntry → MetadataRoute.Sitemap items
  const dynamicEntries: MetadataRoute.Sitemap = promoEntries.map((entry) => ({
    url: entry.loc,
    lastModified: entry.lastmod,
    changeFrequency: entry.changefreq as MetadataRoute.Sitemap[number]["changeFrequency"],
    priority: SITEMAP_PRIORITY.DETAIL,
  }));

  return [...staticEntries, ...dynamicEntries];
}
