export function calculatePremiumTrialDaysRemaining(
  trialEndsAt: string,
  nowMs: number
): number | null {
  const remainingMs = Date.parse(trialEndsAt) - nowMs;

  if (remainingMs <= 0) {
    return 0;
  }

  return Math.max(1, Math.ceil(remainingMs / (24 * 60 * 60 * 1000)));
}
