import { expect, test } from "vitest";
import { readLicenseLines } from "./read-license-lines";
import { runLicenseHarness } from "./run-license-harness";
import { verifyLicenseLine } from "./verify-license-line";

test("the provider-compatible script emits quantity-based multi-line licenses", async () => {
  const output = runLicenseHarness({ licenseQuantity: "3" });
  const licenses = readLicenseLines(output);

  expect(licenses).toHaveLength(3);
  expect(new Set(licenses).size).toBe(3);
  expect(licenses.every((license) => !license.includes("."))).toBe(true);
  await expect(Promise.all(licenses.map((license) => verifyLicenseLine(license)))).resolves.toEqual([
    true,
    true,
    true
  ]);
});
