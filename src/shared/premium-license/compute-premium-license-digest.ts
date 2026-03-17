import { encodePremiumLicenseText } from "./encode-premium-license-text";

export async function computePremiumLicenseDigest(value: string): Promise<Uint8Array> {
  const encoded = encodePremiumLicenseText(value);
  const digest = await globalThis.crypto.subtle.digest("SHA-512", encoded as BufferSource);
  return new Uint8Array(digest);
}
