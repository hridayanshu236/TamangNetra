import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ['pdf-parse-fork'],
  images: {
    qualities: [75, 85],
  },
};

export default nextConfig;
