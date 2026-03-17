import { execFileSync } from "node:child_process";
import { expect, test } from "vitest";

test("an unmapped product and sku fail closed", () => {
  let errorMessage = "";

  try {
    execFileSync(
      "node",
      [
        "scripts/licensing/run-license-harness.mjs",
        "--licenseEmail",
        "user@example.com",
        "--licenseQuantity",
        "1",
        "--product",
        "unknown-product",
        "--sku",
        "UNKNOWN_SKU",
        "--orderReference",
        "ORDER-1"
      ],
      { cwd: process.cwd(), encoding: "utf8", stdio: "pipe" }
    );
  } catch (error) {
    errorMessage = error instanceof Error ? error.message : String(error);
  }

  expect(errorMessage).toContain("Unsupported product/sku mapping.");
});
