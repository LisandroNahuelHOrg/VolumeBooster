import { expect, test } from "vitest";
import { runLicenseHarness } from "./run-license-harness";

test("the generated short license stays within the compact offline range", () => {
  const license = runLicenseHarness().trim();

  expect(license.length).toBeGreaterThanOrEqual(108);
  expect(license.length).toBeLessThanOrEqual(116);
});
