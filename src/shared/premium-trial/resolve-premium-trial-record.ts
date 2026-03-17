import { createPremiumTrialRecord } from "./create-premium-trial-record";
import type { PersistedPremiumTrialRecord } from "./premium-trial-types";

export function resolvePremiumTrialRecord(
  records: Array<PersistedPremiumTrialRecord | null>,
  nowMs: number
): PersistedPremiumTrialRecord {
  const validRecords = records.filter((record): record is PersistedPremiumTrialRecord => record !== null);

  if (validRecords.length === 0) {
    return createPremiumTrialRecord(nowMs);
  }

  let canonicalRecord = validRecords[0];

  for (const record of validRecords) {
    if (Date.parse(record.firstInstalledAt) < Date.parse(canonicalRecord.firstInstalledAt)) {
      canonicalRecord = record;
    }
  }

  return {
    ...canonicalRecord,
    trialConsumed:
      canonicalRecord.trialConsumed || nowMs >= Date.parse(canonicalRecord.trialEndsAt),
    lastSeenAt: new Date(nowMs).toISOString()
  };
}
