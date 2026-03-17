import { PREMIUM_LICENSE_BASE58_ALPHABET } from "./premium-license-constants";

export function decodePremiumLicenseBase58(value: string): Uint8Array {
  if (!value) {
    return new Uint8Array();
  }

  const bytes: number[] = [0];

  for (const character of value) {
    const alphabetIndex = PREMIUM_LICENSE_BASE58_ALPHABET.indexOf(character);

    if (alphabetIndex < 0) {
      throw new Error("Invalid Base58 character.");
    }

    let carry = alphabetIndex;

    for (let index = 0; index < bytes.length; index += 1) {
      const nextValue = bytes[index]! * 58 + carry;
      bytes[index] = nextValue & 255;
      carry = nextValue >> 8;
    }

    while (carry > 0) {
      bytes.push(carry & 255);
      carry >>= 8;
    }
  }

  for (let index = 0; index < value.length && value[index] === "1"; index += 1) {
    bytes.push(0);
  }

  bytes.reverse();
  return Uint8Array.from(bytes);
}
