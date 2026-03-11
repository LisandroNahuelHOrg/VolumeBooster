import { expect, test } from "vitest";
import { renderMarkdownReport } from "./auto-booster/results/render-markdown-report.mjs";

test("renders the stable markdown table used by the auto-booster report artifact", () => {
  const markdown = renderMarkdownReport({
    extensionId: "abc123",
    generatedAt: "2026-03-11T00:00:00.000Z",
    results: [{ classification: "pass_auto", name: "fixture-no-media", passed: true }]
  });

  expect(markdown).toContain("# Auto Booster E2E Report");
  expect(markdown).toContain("Generated at: 2026-03-11T00:00:00.000Z");
  expect(markdown).toContain("Extension ID: abc123");
  expect(markdown).toContain("| fixture-no-media | pass_auto | yes |");
});
