export function parseSiteFilter(argv) {
  for (const argument of argv) {
    if (!argument.startsWith("--sites=")) {
      continue;
    }

    const sites = new Set();
    const rawValues = argument.slice("--sites=".length).split(",");

    for (const rawValue of rawValues) {
      const value = rawValue.trim();

      if (value) {
        sites.add(value);
      }
    }

    return sites;
  }

  return new Set();
}
