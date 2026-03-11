export function requireControlPath(
  map: Map<string, string>,
  shortName: string,
  dspName: string
): string {
  const address = map.get(shortName);

  if (!address) {
    throw new Error(`Missing Faust control path "${shortName}" for ${dspName}.`);
  }

  return address;
}
