import { execFileSync } from "node:child_process";
import { expect, test } from "vitest";

test("invalid JSON attributes fail closed with a clear error", () => {
  let errorMessage = "";

  try {
    execFileSync(
      "node",
      [
        "scripts/licensing/run-license-harness.mjs",
        "--licenseName",
        "Test User",
        "--licenseEmail",
        "user@example.com",
        "--licenseQuantity",
        "1",
        "--product",
        "volume-booster-by-premium11",
        "--sku",
        "SKU",
        "--productAttributesJson",
        "{broken-json}",
        "--orderReference",
        "ORDER-1",
        "--issuedAt",
        "2026-03-16T12:00:00.000Z"
      ],
      { cwd: process.cwd(), encoding: "utf8", stdio: "pipe" }
    );
  } catch (error) {
    errorMessage = error instanceof Error ? error.message : String(error);
  }

  expect(errorMessage).toContain("Product Attributes (JSON) must be valid JSON.");
});
