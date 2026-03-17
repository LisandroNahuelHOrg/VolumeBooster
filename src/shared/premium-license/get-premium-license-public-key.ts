import { PREMIUM_LICENSE_PUBLIC_KEY_BYTES } from "./premium-license-constants";

let premiumLicensePublicKeyPromise: Promise<CryptoKey> | null = null;

export function getPremiumLicensePublicKey(): Promise<CryptoKey> {
  if (!globalThis.crypto?.subtle) {
    return Promise.reject(new Error("WebCrypto is unavailable."));
  }

  if (!premiumLicensePublicKeyPromise) {
    premiumLicensePublicKeyPromise = globalThis.crypto.subtle.importKey(
      "raw",
      PREMIUM_LICENSE_PUBLIC_KEY_BYTES,
      "Ed25519",
      false,
      ["verify"]
    );
  }

  return premiumLicensePublicKeyPromise;
}
