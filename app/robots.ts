import type { MetadataRoute } from "next";
import { getSiteUrl } from "@/shared/utils/seo/site-url";
import { isProduction } from "@/shared/config/app-env";

export default function robots(): MetadataRoute.Robots {
  const siteUrl = getSiteUrl();

  // Fuera de producción (dev/staging) se bloquea la indexación por completo:
  // dev.wedomio.com es un clon del sitio real y, indexado, genera contenido
  // duplicado que perjudica el SEO del dominio de producción.
  if (!isProduction) {
    return { rules: { userAgent: "*", disallow: "/" } };
  }

  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/panel", "/api/internal"],
    },
    sitemap: `${siteUrl}/sitemap.xml`,
    host: siteUrl,
  };
}
