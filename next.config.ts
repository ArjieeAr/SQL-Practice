import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  cacheComponents: true,
  partialPrefetching: true,
  // Load PGlite with Node's own module loader instead of bundling it (it ships WASM + data files).
  // The grader's worker threads are bundled by Turbopack, which recognizes `new Worker(path)`.
  serverExternalPackages: ["@electric-sql/pglite"],
  // The external package is traced whole; its optional Postgres extensions (~10 MB) are never
  // loaded, so keep them out of the serverless function bundle.
  outputFileTracingExcludes: {
    "/api/**": [
      "./node_modules/@electric-sql/pglite/dist/*.tar.gz",
      "./node_modules/@electric-sql/pglite/dist/contrib/**",
    ],
  },
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
