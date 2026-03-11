import type { StorageAreaLike } from "../storage";

export function getSessionBoostStorageArea(): StorageAreaLike {
  return (
    globalThis.chrome?.storage?.session ??
    globalThis.chrome?.storage?.local ?? {
      async get() {
        return {};
      },
      async set() {
        return;
      }
    }
  );
}
