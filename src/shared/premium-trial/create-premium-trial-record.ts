import {
  PREMIUM_TRIAL_DAYS,
  PREMIUM_TRIAL_RECORD_VERSION
} from "./premium-trial-constants";
import type { PersistedPremiumTrialRecord } from "./premium-trial-types";

export function createPremiumTrialRecord(nowMs: number): PersistedPremiumTrialRecord {
  const firstInstalledAt = new Date(nowMs).toISOString();
  const trialEndsAt = new Date(nowMs + PREMIUM_TRIAL_DAYS * 24 * 60 * 60 * 1000).toISOString();

  return {
    version: PREMIUM_TRIAL_RECORD_VERSION,
    firstInstalledAt,
    trialEndsAt,
    trialConsumed: false,
    lastSeenAt: firstInstalledAt
  };
}
