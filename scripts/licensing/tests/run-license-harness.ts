import { execFileSync } from "node:child_process";
import { EXAMPLE_LICENSE_OPTIONS } from "./example-license-options";

export function runLicenseHarness(overrides: Record<string, string> = {}) {
  const options = { ...EXAMPLE_LICENSE_OPTIONS, ...overrides };
  return execFileSync(
    "node",
    [
      "scripts/licensing/run-license-harness.mjs",
      "--licenseName",
      options.licenseName,
      "--licenseCompany",
      options.licenseCompany,
      "--licenseEmail",
      options.licenseEmail,
      "--licenseQuantity",
      options.licenseQuantity,
      "--product",
      options.product,
      "--sku",
      options.sku,
      "--productAttributesJson",
      options.productAttributesJson,
      "--orderReference",
      options.orderReference,
      "--subscriptionId",
      options.subscriptionId,
      "--subscriptionSequence",
      options.subscriptionSequence,
      "--subscriptionPeriods",
      options.subscriptionPeriods,
      "--subscriptionAttributesJson",
      options.subscriptionAttributesJson,
      "--issuedAt",
      options.issuedAt
    ],
    { cwd: process.cwd(), encoding: "utf8" }
  );
}
