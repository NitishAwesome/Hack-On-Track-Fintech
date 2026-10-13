import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  // Keep production verification separate from a running development server.
  distDir: process.env.FINOVA_BUILD_DIR || '.next',
  turbopack: {
    root: path.resolve(__dirname),
  },
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "lh3.googleusercontent.com" },
      { protocol: "https", hostname: "avatars.githubusercontent.com" },
    ],
  },
};

// Trigger Next.js configuration reload
export default nextConfig;

