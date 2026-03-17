import {
  PREMIUM_TRIAL_INDEXED_DB_NAME,
  PREMIUM_TRIAL_INDEXED_DB_STORE,
  PREMIUM_TRIAL_STORAGE_KEY
} from "./premium-trial-constants";
import type { PersistedPremiumTrialRecord } from "./premium-trial-types";

export async function writePremiumTrialRecordToIndexedDb(
  record: PersistedPremiumTrialRecord
): Promise<void> {
  if (typeof indexedDB === "undefined") {
    return;
  }

  await new Promise<void>((resolve) => {
    const request = indexedDB.open(PREMIUM_TRIAL_INDEXED_DB_NAME, 1);

    request.onupgradeneeded = () => {
      request.result.createObjectStore(PREMIUM_TRIAL_INDEXED_DB_STORE);
    };
    request.onerror = () => resolve();
    request.onsuccess = () => {
      const database = request.result;
      const transaction = database.transaction(PREMIUM_TRIAL_INDEXED_DB_STORE, "readwrite");

      transaction.oncomplete = () => {
        database.close();
        resolve();
      };
      transaction.onerror = () => {
        database.close();
        resolve();
      };
      transaction.objectStore(PREMIUM_TRIAL_INDEXED_DB_STORE).put(record, PREMIUM_TRIAL_STORAGE_KEY);
    };
  });
}
