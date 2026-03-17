import { execFileSync } from "node:child_process";
import { expect, test } from "vitest";

test("missing required fields and invalid quantity fail validation", () => {
  let missingFieldMessage = "";
  let invalidQuantityMessage = "";
  let overflowQuantityMessage = "";

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
        "--orderReference",
        "ORDER-1",
        "--issuedAt",
        "2026-03-16T12:00:00.000Z"
      ],
      { cwd: process.cwd(), encoding: "utf8", stdio: "pipe" }
    );
  } catch (error) {
    missingFieldMessage = error instanceof Error ? error.message : String(error);
  }

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
        "0",
        "--product",
        "volume-booster-by-premium11",
        "--sku",
        "SKU",
        "--orderReference",
        "ORDER-1",
        "--issuedAt",
        "2026-03-16T12:00:00.000Z"
      ],
      { cwd: process.cwd(), encoding: "utf8", stdio: "pipe" }
    );
  } catch (error) {
    invalidQuantityMessage = error instanceof Error ? error.message : String(error);
  }

  try {
    execFileSync(
      "node",
      [
        "scripts/licensing/run-license-harness.mjs",
        "--licenseEmail",
        "user@example.com",
        "--licenseQuantity",
        "65536",
        "--product",
        "volume-booster-by-premium11",
        "--sku",
        "SKU",
        "--orderReference",
        "ORDER-1"
      ],
      { cwd: process.cwd(), encoding: "utf8", stdio: "pipe" }
    );
  } catch (error) {
    overflowQuantityMessage = error instanceof Error ? error.message : String(error);
  }

  expect(missingFieldMessage).toContain("Missing required input: Sku.");
  expect(invalidQuantityMessage).toContain("License Quantity must be between 1 and 65535.");
  expect(overflowQuantityMessage).toContain("License Quantity must be between 1 and 65535.");
});
