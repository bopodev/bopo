import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    include: ["tests/**/*.test.ts"],
    coverage: {
      provider: "v8",
      reporter: ["text", "html", "json-summary"],
      include: ["apps/**/*.ts", "packages/**/*.ts"],
      thresholds: {
        lines: 40,
        functions: 40,
        branches: 30,
        statements: 40
      }
    }
  }
});
