import path from "node:path";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "."),
    },
  },
  test: {
    environment: "node",
    globals: true,
    include: ["lib/**/*.test.ts", "lib/**/*.test.tsx", "tests/**/*.test.ts"],
    coverage: {
      provider: "v8",
      reporter: ["text", "html"],
      include: [
        "lib/normalizers.ts",
        "lib/normalize-record.ts",
        "lib/csv-parser.ts",
        "lib/conflict-scorer.ts",
        "lib/pattern-library.ts",
        "lib/claude.ts",
        "lib/delta-engine.ts",
        "lib/digest.ts",
      ],
      exclude: ["lib/**/*.test.ts", "lib/test-utils/**"],
      thresholds: {
        lines: 80,
        functions: 80,
        branches: 80,
        statements: 80,
      },
    },
  },
});
