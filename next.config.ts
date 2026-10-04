import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Lagbilder skickas som små komprimerade bilder via server actions.
  experimental: { serverActions: { bodySizeLimit: "2mb" } },
};

export default nextConfig;
