/**
 * @fileoverview Verificación de consistencia entre locales, placeholders,
 * familias plurales y calidad mínima del catálogo canónico.
 */
import { resolve } from "node:path";
import { runI18nCheck } from "./i18n-check-lib.mjs";

const repoRoot = resolve(import.meta.dirname, "..");
const { issues, localeDirs } = runI18nCheck(repoRoot);

if (issues.length > 0) {
  console.error("i18n check failed:");
  for (const issue of issues) {
    console.error(`- ${issue}`);
  }
  process.exit(1);
}

console.log(`i18n check passed for locales: ${localeDirs.join(", ")}`);
