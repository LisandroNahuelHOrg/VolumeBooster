import { readPremiumTrialRecordFromIndexedDb } from "./read-premium-trial-record-from-indexed-db";
import { readPremiumTrialRecordFromStorageArea } from "./read-premium-trial-record-from-storage-area";
import { resolvePremiumTrialRecord } from "./resolve-premium-trial-record";
import { writePremiumTrialRecordToIndexedDb } from "./write-premium-trial-record-to-indexed-db";
import { writePremiumTrialRecordToStorageArea } from "./write-premium-trial-record-to-storage-area";
import type {
  PersistedPremiumTrialRecord,
  PremiumTrialRepositoryApi,
  PremiumTrialRepositoryContext
} from "./premium-trial-types";

export async function ensurePremiumTrialRecord(
  this: PremiumTrialRepositoryApi & PremiumTrialRepositoryContext,
  nowMs: number
): Promise<PersistedPremiumTrialRecord> {
  const [localRecord, syncRecord, indexedDbRecord] = await Promise.all([
    readPremiumTrialRecordFromStorageArea(this.localStorageArea, nowMs),
    readPremiumTrialRecordFromStorageArea(this.syncStorageArea, nowMs),
    readPremiumTrialRecordFromIndexedDb(nowMs)
  ]);
  const canonicalRecord = resolvePremiumTrialRecord(
    [localRecord, syncRecord, indexedDbRecord],
    nowMs
  );

  await Promise.allSettled([
    writePremiumTrialRecordToStorageArea(this.localStorageArea, canonicalRecord),
    writePremiumTrialRecordToStorageArea(this.syncStorageArea, canonicalRecord),
    writePremiumTrialRecordToIndexedDb(canonicalRecord)
  ]);

  return canonicalRecord;
}
