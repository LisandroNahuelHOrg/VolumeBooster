import { expect, test } from "vitest";
import { createLicenseProviderLegacyContext } from "../harness/create-license-provider-legacy-context.mjs";
import { executeLicenseScript } from "../harness/execute-license-script.mjs";
import { readLicenseScriptSource } from "../harness/read-license-script-source.mjs";
import { EXAMPLE_LICENSE_OPTIONS } from "./example-license-options";
import { readLicenseLines } from "./read-license-lines";

test(
  "the provider script still emits multiple lines in the legacy host runtime",
  () => {
    const output = executeLicenseScript(
      readLicenseScriptSource(),
      createLicenseProviderLegacyContext({
        ...EXAMPLE_LICENSE_OPTIONS,
        licenseQuantity: "3"
      })
    );
    const licenses = readLicenseLines(output);

    expect(typeof output).toBe("string");
    expect(licenses).toHaveLength(3);
    expect(new Set(licenses).size).toBe(3);
  },
  20_000
);
