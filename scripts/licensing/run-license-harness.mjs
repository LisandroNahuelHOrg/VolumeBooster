import { createLicenseProviderContext } from "./harness/create-license-provider-context.mjs";
import { executeLicenseScript } from "./harness/execute-license-script.mjs";
import { parseLicenseCliOptions } from "./harness/parse-license-cli-options.mjs";
import { readLicenseScriptSource } from "./harness/read-license-script-source.mjs";

try {
  const options = parseLicenseCliOptions(process.argv);
  const result = executeLicenseScript(
    readLicenseScriptSource(),
    createLicenseProviderContext(options)
  );
  process.stdout.write(`${result}\n`);
} catch (error) {
  process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
  process.exitCode = 1;
}
