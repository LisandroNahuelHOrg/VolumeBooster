export function normalizePremiumLicenseKey(licenseKey: string): string {
  return licenseKey.replace(/[\s-]+/gu, "").trim();
}
