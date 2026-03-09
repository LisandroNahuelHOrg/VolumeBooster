declare module "../../scripts/i18n-audit-lib.mjs" {
  export const I18N_AUDIT_TARGETS: string[];
  export function auditHtmlSource(source: string, label: string, config?: unknown): string[];
  export function auditTypeScriptSource(sourceText: string, label: string, config?: unknown): string[];
  export function runI18nLiteralAudit(repoRoot: string): { issues: string[]; targetFiles: string[] };
}

declare module "../../scripts/i18n-check-lib.mjs" {
  export function isGenericEnglishDescription(description: string): boolean;
  export function runI18nCheck(repoRoot: string): { issues: string[]; localeDirs: string[] };
}
