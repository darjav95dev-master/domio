import type { NextConfig } from "next";

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
};

export default nextConfig;
