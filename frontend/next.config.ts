import type { NextConfig } from "next";
import { resolve } from "node:path";

const appRoot = process.cwd();

/** Old Galaxy imports walked out of the app to repo-root demo-data. Turbopack
 *  will not resolve those once tracing stays inside `frontend/`. */
const PIPELINE_JSON = {
  "8.223-graph": resolve(appRoot, "lib/world/pipeline/8.223-knowledge-graph.json"),
  "8.223-world": resolve(appRoot, "lib/world/pipeline/8.223-world.json"),
  "6.1400-graph": resolve(appRoot, "lib/world/pipeline/6.1400-knowledge-graph.json"),
  "6.1400-world": resolve(appRoot, "lib/world/pipeline/6.1400-world.json"),
} as const;

const DEMO_DATA_ALIASES: Record<string, string> = {
  "../../../demo-data/two-course-pipeline/8.223/students/82230000-0000-4000-8000-000000000001/knowledge-graph.json":
    PIPELINE_JSON["8.223-graph"],
  "../../../demo-data/two-course-pipeline/8.223/students/82230000-0000-4000-8000-000000000001/world.json":
    PIPELINE_JSON["8.223-world"],
  "../../../demo-data/two-course-pipeline/6.1400/students/61400000-0000-4000-8000-000000000001/knowledge-graph.json":
    PIPELINE_JSON["6.1400-graph"],
  "../../../demo-data/two-course-pipeline/6.1400/students/61400000-0000-4000-8000-000000000001/world.json":
    PIPELINE_JSON["6.1400-world"],
};

const nextConfig: NextConfig = {
  // A second `next dev` (for example a mock-data instance for verification) gets its own build
  // directory so it does not fight the main one for `.next/dev`: NEXT_DIST_DIR=.next-verify
  distDir: process.env.NEXT_DIST_DIR || ".next",
  // Keep NFT inside this app. A parent ../../assets path is what made Vercel
  // try to copy that directory onto itself after `next build`.
  outputFileTracingRoot: appRoot,
  turbopack: {
    root: appRoot,
    resolveAlias: DEMO_DATA_ALIASES,
  },
  webpack: (config) => {
    config.resolve.alias = {
      ...config.resolve.alias,
      ...DEMO_DATA_ALIASES,
    };
    return config;
  },
};

export default nextConfig;
