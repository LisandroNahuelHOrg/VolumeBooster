export function parseScenarioFilter(argv) {
  for (const argument of argv) {
    if (!argument.startsWith("--scenarios=")) {
      continue;
    }

    const scenarios = new Set();
    const rawValues = argument.slice("--scenarios=".length).split(",");

    for (const rawValue of rawValues) {
      const value = rawValue.trim();

      if (value) {
        scenarios.add(value);
      }
    }

    return scenarios;
  }

  return new Set();
}
