import { PREMIUM_TRIAL_STORAGE_KEY } from "./premium-trial-constants";
import { sanitizePremiumTrialRecord } from "./sanitize-premium-trial-record";
import type {
  PersistedPremiumTrialRecord,
  PremiumTrialStorageAreaLike
} from "./premium-trial-types";

export async function readPremiumTrialRecordFromStorageArea(
  storageArea: PremiumTrialStorageAreaLike | null,
  nowMs: number
): Promise<PersistedPremiumTrialRecord | null> {
  if (!storageArea) {
    return null;
  }

  try {
    const result = await storageArea.get(PREMIUM_TRIAL_STORAGE_KEY);
    return sanitizePremiumTrialRecord(result[PREMIUM_TRIAL_STORAGE_KEY], nowMs);
  } catch {
    return null;
  }
}
