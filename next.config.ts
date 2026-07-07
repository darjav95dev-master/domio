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
    ],
  },
};

export default nextConfig;
