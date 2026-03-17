import { expect, test } from "vitest";
import { parsePremiumLicenseToken } from "../../../src/shared/premium-license";
import { readLicenseLines } from "./read-license-lines";
import { runLicenseHarness } from "./run-license-harness";

test("each seat emits a distinct token with its own seat index", () => {
  const [firstLicense, secondLicense] = readLicenseLines(runLicenseHarness({ licenseQuantity: "2" }));
  const firstToken = parsePremiumLicenseToken(firstLicense!);
  const secondToken = parsePremiumLicenseToken(secondLicense!);

  expect(firstLicense).not.toBe(secondLicense);
  expect(firstToken.seatIndex).toBe(1);
  expect(secondToken.seatIndex).toBe(2);
});
