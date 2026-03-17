import { expect, test } from "vitest";
import { readLicenseLines } from "./read-license-lines";
import { runLicenseHarness } from "./run-license-harness";

test("multi-seat licenses differ across the string instead of only at the suffix", () => {
  const [firstLicense, secondLicense] = readLicenseLines(runLicenseHarness({ licenseQuantity: "2" }));
  let differenceCount = 0;

  for (let index = 0; index < firstLicense!.length; index += 1) {
    if (firstLicense![index] !== secondLicense![index]) {
      differenceCount += 1;
    }
  }

  expect(differenceCount).toBeGreaterThan(20);
});
