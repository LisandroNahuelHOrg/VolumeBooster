/**
 * @fileoverview Writes items into the in-memory storage test double.
 * @module shared/storage/tests/set-storage-area-items
 */

export async function setStorageAreaItems(store: Record<string, unknown>, items: Record<string, unknown>): Promise<void> {
  Object.assign(store, items);
}
