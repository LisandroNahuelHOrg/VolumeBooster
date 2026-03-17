import { computePremiumLicenseDigest } from "./compute-premium-license-digest";
import { PREMIUM_LICENSE_EMAIL_FINGERPRINT_LENGTH } from "./premium-license-constants";

export async function createPremiumLicenseEmailFingerprint(
  normalizedEmail: string
): Promise<Uint8Array> {
  return (await computePremiumLicenseDigest(`prism-vb-license-email:${normalizedEmail}`)).subarray(
    0,
    PREMIUM_LICENSE_EMAIL_FINGERPRINT_LENGTH
  );
}
