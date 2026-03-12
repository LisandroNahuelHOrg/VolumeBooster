/**
 * @fileoverview Shared test storage types used by storage characterization suites.
 * @module shared/storage/tests/test-storage-area
 */

import type { StorageAreaLike } from "../../storage";

export interface TestStorageArea extends StorageAreaLike {
  store: Record<string, unknown>;
}
