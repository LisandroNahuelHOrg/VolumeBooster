export function xorPremiumLicenseSeatMask(value: Uint8Array, seatIndex: number): Uint8Array {
  const result = new Uint8Array(value.length);
  let seed = (((seatIndex & 65535) | 1) ^ 0x9e3779b9) >>> 0;

  for (let index = 0; index < value.length; index += 1) {
    seed ^= seed << 13;
    seed ^= seed >>> 17;
    seed ^= seed << 5;
    result[index] = (value[index] ?? 0) ^ (seed & 255);
  }

  return result;
}
