import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  experimental: {
   serverExternalPackages: ['youtubei.js'],
  },
};

export default nextConfig;
