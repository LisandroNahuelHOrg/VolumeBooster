import fs from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

export function readLicenseScriptSource() {
  const currentDirectory = dirname(fileURLToPath(import.meta.url));
  return fs.readFileSync(resolve(currentDirectory, "..", "generate-lifetime-license.mjs"), "utf8");
}
