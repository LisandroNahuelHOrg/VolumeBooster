import { computePremiumLicenseDigest } from "./compute-premium-license-digest";
import { PREMIUM_LICENSE_ORDER_FINGERPRINT_LENGTH } from "./premium-license-constants";

export async function createPremiumLicenseOrderFingerprint(
  orderReference: string
): Promise<Uint8Array> {
  return (await computePremiumLicenseDigest(`prism-vb-license-order:${orderReference.trim()}`)).subarray(
    0,
    PREMIUM_LICENSE_ORDER_FINGERPRINT_LENGTH
  );
}
