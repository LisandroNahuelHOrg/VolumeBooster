export function getMainWorldAutoplayPolicy(audioContext: AudioContext): string | undefined {
  const policyApi = (
    navigator as Navigator & {
      getAutoplayPolicy?: (target?: string | AudioContext | HTMLMediaElement) => string;
    }
  ).getAutoplayPolicy;

  if (typeof policyApi !== "function") {
    return undefined;
  }

  try {
    return policyApi(audioContext);
  } catch {
    try {
      return policyApi("audiocontext");
    } catch {
      return undefined;
    }
  }
}
