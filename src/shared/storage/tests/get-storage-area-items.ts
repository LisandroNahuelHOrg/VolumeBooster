/**
 * @fileoverview Reads keys from the in-memory storage test double.
 * @module shared/storage/tests/get-storage-area-items
 */

export async function getStorageAreaItems(
  store: Record<string, unknown>,
  keys?: string | string[] | null
): Promise<Record<string, unknown>> {
  if (!keys) {
    return { ...store };
  }

  if (typeof keys === "string") {
    return { [keys]: store[keys] };
  }

  const result: Record<string, unknown> = {};

  for (const key of keys) {
    result[key] = store[key];
  }

  return result;
}
