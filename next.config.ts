import type { NextConfig } from "next";

// APP_ENV se conoce en build (se hornea por entorno). Fuera de producción, dev es
// un clon del sitio real: se añade X-Robots-Tag para que ningún buscador lo
// indexe, en TODAS las rutas (el robots.txt solo lo respetan los crawlers que lo
// leen; la cabecera cubre el resto).
const isProductionBuild =
  (process.env.NEXT_PUBLIC_APP_ENV ?? process.env.APP_ENV) === "production";

const securityHeaders = [
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
  ...(isProductionBuild
    ? []
    : [{ key: "X-Robots-Tag", value: "noindex, nofollow" }]),
];

const nextConfig: NextConfig = {
  reactStrictMode: true,
  output: "standalone",
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: new URL(
          process.env.R2_PUBLIC_URL || "https://placeholder.com",
        ).hostname,
      },
      // Unsplash — free, license-clear demo photos used by the seed (local/demo).
      { protocol: "https", hostname: "images.unsplash.com" },
    ],
  },
  async headers() {
    return [{ source: "/(.*)", headers: securityHeaders }];
  },
};

export default nextConfig;
