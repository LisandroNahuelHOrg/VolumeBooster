import type { PremiumLicenseTokenParts } from "./premium-license-types";
import { getPremiumLicensePublicKey } from "./get-premium-license-public-key";

export async function verifyPremiumLicenseSignature(
  token: PremiumLicenseTokenParts
): Promise<boolean> {
  return globalThis.crypto.subtle.verify(
    "Ed25519",
    await getPremiumLicensePublicKey(),
    token.signature as BufferSource,
    token.payload as BufferSource
  );
}
