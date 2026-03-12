export function parseTargets(argv) {
  let targetValue = "all";

  for (const argument of argv) {
    if (argument.startsWith("--targets=")) {
      targetValue = argument.slice("--targets=".length);
      break;
    }
  }

  return new Set(targetValue.split(","));
}
