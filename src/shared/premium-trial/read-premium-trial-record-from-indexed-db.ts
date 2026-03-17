import {
  PREMIUM_TRIAL_INDEXED_DB_NAME,
  PREMIUM_TRIAL_INDEXED_DB_STORE,
  PREMIUM_TRIAL_STORAGE_KEY
} from "./premium-trial-constants";
import { sanitizePremiumTrialRecord } from "./sanitize-premium-trial-record";
import type { PersistedPremiumTrialRecord } from "./premium-trial-types";

export async function readPremiumTrialRecordFromIndexedDb(
  nowMs: number
): Promise<PersistedPremiumTrialRecord | null> {
  if (typeof indexedDB === "undefined") {
    return null;
  }

  return new Promise((resolve) => {
    const request = indexedDB.open(PREMIUM_TRIAL_INDEXED_DB_NAME, 1);

    request.onupgradeneeded = () => {
      request.result.createObjectStore(PREMIUM_TRIAL_INDEXED_DB_STORE);
    };
    request.onerror = () => resolve(null);
    request.onsuccess = () => {
      const database = request.result;
      const transaction = database.transaction(PREMIUM_TRIAL_INDEXED_DB_STORE, "readonly");
      const store = transaction.objectStore(PREMIUM_TRIAL_INDEXED_DB_STORE);
      const getRequest = store.get(PREMIUM_TRIAL_STORAGE_KEY);

      getRequest.onerror = () => {
        database.close();
        resolve(null);
      };
      getRequest.onsuccess = () => {
        database.close();
        resolve(sanitizePremiumTrialRecord(getRequest.result, nowMs));
      };
    };
  });
}
