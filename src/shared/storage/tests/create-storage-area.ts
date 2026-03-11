/**
 * @fileoverview Builds an in-memory storage double for repository tests.
 * @module shared/storage/tests/create-storage-area
 */

import { getStorageAreaItems } from "./get-storage-area-items";
import { setStorageAreaItems } from "./set-storage-area-items";
import type { TestStorageArea } from "./test-storage-area";

export function createStorageArea(seed?: Record<string, unknown>): TestStorageArea {
  const store = { ...seed };

  return {
    store,
    get: getStorageAreaItems.bind(undefined, store) as TestStorageArea["get"],
    set: setStorageAreaItems.bind(undefined, store) as TestStorageArea["set"]
  };
}
