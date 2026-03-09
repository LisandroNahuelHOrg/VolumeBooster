/**
 * @fileoverview Auditoría estática de strings visibles hardcodeados que deben
 * vivir en el sistema i18n del proyecto.
 */
import { resolve } from "node:path";
import { runI18nLiteralAudit } from "./i18n-audit-lib.mjs";

const repoRoot = resolve(import.meta.dirname, "..");
const { issues, targetFiles } = runI18nLiteralAudit(repoRoot);

if (issues.length > 0) {
  console.error("i18n literal audit failed:");
  for (const issue of issues) {
    console.error(`- ${issue}`);
  }
  process.exit(1);
}

console.log(`i18n literal audit passed for ${targetFiles.length} files.`);
