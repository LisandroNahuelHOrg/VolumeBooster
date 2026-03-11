export function getNavigatorAutoplayPolicy(
  target?: string | BaseAudioContext | HTMLMediaElement,
  fallbackTarget?: string
): string | undefined {
  const policyApi = (
    navigator as Navigator & {
      getAutoplayPolicy?: (currentTarget?: string | BaseAudioContext | HTMLMediaElement) => string;
    }
  ).getAutoplayPolicy;

  if (typeof policyApi !== "function") {
    return undefined;
  }

  try {
    return policyApi(target);
  } catch {
    if (!fallbackTarget) {
      return undefined;
    }
  }

  try {
    return policyApi(fallbackTarget);
  } catch {
    return undefined;
  }
}
