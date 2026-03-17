import {
  PREMIUM_TRIAL_DAYS,
  PREMIUM_TRIAL_RECORD_VERSION
} from "./premium-trial-constants";
import type { PersistedPremiumTrialRecord } from "./premium-trial-types";

export function sanitizePremiumTrialRecord(
  value: unknown,
  nowMs: number
): PersistedPremiumTrialRecord | null {
  if (!value || typeof value !== "object") {
    return null;
  }

  const record = value as Partial<PersistedPremiumTrialRecord>;
  const firstInstalledAtMs = new Date(record.firstInstalledAt ?? "").getTime();

  if (record.version !== PREMIUM_TRIAL_RECORD_VERSION || Number.isNaN(firstInstalledAtMs)) {
    return null;
  }

  if (firstInstalledAtMs <= 0 || firstInstalledAtMs > nowMs) {
    return null;
  }

  const trialEndsAt = new Date(firstInstalledAtMs + PREMIUM_TRIAL_DAYS * 24 * 60 * 60 * 1000).toISOString();
  const lastSeenAtMs = new Date(record.lastSeenAt ?? "").getTime();

  return {
    version: PREMIUM_TRIAL_RECORD_VERSION,
    firstInstalledAt: new Date(firstInstalledAtMs).toISOString(),
    trialEndsAt,
    trialConsumed: Boolean(record.trialConsumed) || nowMs >= Date.parse(trialEndsAt),
    lastSeenAt: Number.isNaN(lastSeenAtMs) ? new Date(nowMs).toISOString() : new Date(lastSeenAtMs).toISOString()
  };
}
