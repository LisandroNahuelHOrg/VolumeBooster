import { expect, test } from "vitest";
import {
  encodePremiumLicenseBase58,
  parsePremiumLicenseToken,
  validatePremiumLicenseActivation
} from "../../../src/shared/premium-license";
import { runLicenseHarness } from "./run-license-harness";

test("seat indexes outside the signed quantity are rejected", async () => {
  const licenseLine = runLicenseHarness().trim();
  const token = parsePremiumLicenseToken(licenseLine);
  const tamperedBytes = new Uint8Array(token.bytes);
  tamperedBytes[tamperedBytes.length - 1] = 2;
  const tamperedLicense = encodePremiumLicenseBase58(tamperedBytes);

  await expect(
    validatePremiumLicenseActivation({
      email: "vagif.samadoghlu@example.com",
      licenseKey: tamperedLicense
    })
  ).resolves.toEqual({ ok: false, errorKey: "errorPremiumLicenseInvalid" });
});
