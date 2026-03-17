import { expect, test } from "vitest";
import { parsePremiumLicenseToken, encodePremiumLicenseBase58 } from "../../../src/shared/premium-license";
import { runLicenseHarness } from "./run-license-harness";
import { verifyLicenseLine } from "./verify-license-line";

test("the emitted lines verify and tampering invalidates the signature", async () => {
  const output = runLicenseHarness();
  const licenseLine = output.trim();
  const token = parsePremiumLicenseToken(licenseLine);
  const tamperedBytes = new Uint8Array(token.bytes);
  tamperedBytes[0] = tamperedBytes[0] === 57 ? 56 : tamperedBytes[0] + 1;
  const tamperedLine = encodePremiumLicenseBase58(tamperedBytes);

  await expect(verifyLicenseLine(licenseLine)).resolves.toBe(true);
  await expect(verifyLicenseLine(tamperedLine)).resolves.toBe(false);
});
