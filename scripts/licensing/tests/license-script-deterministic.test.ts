import { expect, test } from "vitest";
import { runLicenseHarness } from "./run-license-harness";

test("the provider-compatible script stays deterministic when issuedAt is fixed", () => {
  const firstOutput = runLicenseHarness({ licenseQuantity: "2" });
  const secondOutput = runLicenseHarness({ licenseQuantity: "2" });

  expect(firstOutput).toBe(secondOutput);
});
