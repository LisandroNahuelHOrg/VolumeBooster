import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    globals: true,
    include: ["src/**/*.test.ts"],
    exclude: [".stryker-tmp/**", "node_modules/**"],
    coverage: {
      provider: "v8",
      include: [
        "src/shared/**/*.ts",
        "src/worker/**/*.ts",
        "src/content/**/*.ts",
        "src/offscreen/**/*.ts",
        "src/popup/model.ts"
      ],
      exclude: [
        "src/**/*.test.ts",
        "src/**/__tests__/**",
        "src/**/main.ts",
        "src/offscreen/faust-*-worklet.ts",
        "src/generated/**",
        "src/types/**/*.d.ts"
      ],
      reporter: ["text-summary", "json-summary", "html"],
      thresholds: {
        statements: 95,
        lines: 95,
        functions: 90,
        branches: 85
      }
    }
  }
});
