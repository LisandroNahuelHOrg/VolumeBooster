export function getSiteGlyph(label: string, domain?: string): string {
  const candidate = domain || label;
  const match = candidate.match(/[a-z0-9]/i);
  return (match?.[0] || "?").toUpperCase();
}
