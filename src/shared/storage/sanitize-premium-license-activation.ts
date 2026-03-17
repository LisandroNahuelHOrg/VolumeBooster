import type { PersistedPremiumLicenseActivation } from "../premium-license";

export function sanitizePremiumLicenseActivation(
  value: unknown
): PersistedPremiumLicenseActivation | null {
  if (!value || typeof value !== "object") {
    return null;
  }

  const email = typeof (value as { email?: unknown }).email === "string"
    ? (value as { email: string }).email.trim()
    : "";
  const licenseKey = typeof (value as { licenseKey?: unknown }).licenseKey === "string"
    ? (value as { licenseKey: string }).licenseKey.trim()
    : "";

  if (!email || !licenseKey) {
    return null;
  }

  return { email, licenseKey };
}
