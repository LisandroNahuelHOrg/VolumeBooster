const defaultMutate = [
  "src/shared/**/*.ts",
  "src/worker/**/*.ts",
  "src/content/**/*.ts",
  "src/offscreen/**/*.ts",
  "src/popup/model.ts",
  "!src/**/*.test.ts",
  "!src/**/main.ts",
  "!src/generated/**",
  "!src/types/**/*.d.ts"
];

function resolveMutatePatterns() {
  const override = process.env.STRYKER_MUTATE?.trim();

  if (!override) {
    return defaultMutate;
  }

  return override
    .split(",")
    .map((entry) => entry.trim())
    .filter(Boolean);
}

export default {
  testRunner: "vitest",
  plugins: ["@stryker-mutator/vitest-runner"],
  checkers: [],
  mutate: resolveMutatePatterns(),
  coverageAnalysis: "all",
  ignoreStatic: false,
  reporters: ["clear-text", "progress", "html", "json"],
  concurrency: 2,
  timeoutMS: 10000,
  timeoutFactor: 2,
  ignorePatterns: ["coverage", "dist", "output", "stryker-reports", "playwright-report"],
  tempDirName: ".stryker-tmp",
  thresholds: {
    high: 90,
    low: 80,
    break: 90
  },
  vitest: {
    configFile: "vitest.config.ts",
    related: false
  }
};
