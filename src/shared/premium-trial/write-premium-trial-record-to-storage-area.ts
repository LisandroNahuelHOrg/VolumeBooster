import { PREMIUM_TRIAL_STORAGE_KEY } from "./premium-trial-constants";
import type {
  PersistedPremiumTrialRecord,
  PremiumTrialStorageAreaLike
} from "./premium-trial-types";

export async function writePremiumTrialRecordToStorageArea(
  storageArea: PremiumTrialStorageAreaLike | null,
  record: PersistedPremiumTrialRecord
): Promise<void> {
  if (!storageArea) {
    return;
  }

  try {
    await storageArea.set({ [PREMIUM_TRIAL_STORAGE_KEY]: record });
  } catch {
    // Best-effort persistence only.
  }
}
