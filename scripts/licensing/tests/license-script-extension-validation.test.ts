import { expect, test } from "vitest";
import { validatePremiumLicenseActivation } from "../../../src/shared/premium-license";
import { runLicenseHarness } from "./run-license-harness";

test("the generated short licenses are accepted only for the correct email", async () => {
  const licenseKey = runLicenseHarness().trim();
  const validResult = await validatePremiumLicenseActivation({
    email: "vagif.samadoghlu@example.com",
    licenseKey
  });
  const invalidResult = await validatePremiumLicenseActivation({
    email: "other@example.com",
    licenseKey
  });

  expect(validResult.ok).toBe(true);
  expect(invalidResult).toEqual({ ok: false, errorKey: "errorPremiumLicenseInvalid" });
});
