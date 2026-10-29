import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: { tsconfigPaths: true },
  test: {
    // Unit tests cover pure logic (result comparison, grading), so Node is enough.
    environment: "node",
    include: ["tests/unit/**/*.test.ts", "tests/integration/**/*.test.ts"],
    // PGlite boots a WASM Postgres per instance; give those tests headroom.
    testTimeout: 30_000,
  },
});
