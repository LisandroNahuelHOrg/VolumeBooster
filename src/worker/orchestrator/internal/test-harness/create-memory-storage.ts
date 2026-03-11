import type { StorageAreaLike } from "../../../../shared/storage";
import { getMemoryStorageItems } from "./get-memory-storage-items";
import { setMemoryStorageItems } from "./set-memory-storage-items";

export function createMemoryStorage(): { area: StorageAreaLike } {
  const store: Record<string, unknown> = {};

  return {
    area: {
      get: getMemoryStorageItems.bind(undefined, store) as StorageAreaLike["get"],
      set: setMemoryStorageItems.bind(undefined, store) as StorageAreaLike["set"]
    }
  };
}
