import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
   serverExternalPackages: ['youtubei.js'],
  // env: {
    // ANTHROPIC_API_KEY: process.env.ANTHROPIC_API_KEY,
    //YOUTUBE_API_KEY: process.env.YOUTUBE_API_KEY,
  // },
};

export default nextConfig;
