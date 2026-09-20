import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // A second `next dev` (for example a mock-data instance for verification) gets its own build
  // directory so it does not fight the main one for `.next/dev`: NEXT_DIST_DIR=.next-verify
  distDir: process.env.NEXT_DIST_DIR || ".next",
  // public/assets is a symlink to ../../assets. Keep NFT inside this app so Vercel
  // does not try to copy that path onto itself after `next build`.
  outputFileTracingRoot: process.cwd(),
  outputFileTracingExcludes: {
    "*": ["../../assets/**", "../assets/**"],
  },
};

export default nextConfig;
