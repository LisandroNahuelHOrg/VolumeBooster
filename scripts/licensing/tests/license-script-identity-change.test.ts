import { expect, test } from "vitest";
import { runLicenseHarness } from "./run-license-harness";

test("changing email or order reference changes the emitted license lines", () => {
  const baseOutput = runLicenseHarness();
  const emailOutput = runLicenseHarness({ licenseEmail: "other@example.com" });
  const referenceOutput = runLicenseHarness({ orderReference: "ORDER-CHANGED" });

  expect(baseOutput).not.toBe(emailOutput);
  expect(baseOutput).not.toBe(referenceOutput);
});
