export function encodePremiumLicenseText(value: string): Uint8Array {
  return new TextEncoder().encode(value);
}
