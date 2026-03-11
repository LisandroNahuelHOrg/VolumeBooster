/**
 * @fileoverview Verifies empty domain arguments skip storage work entirely.
 * @module shared/storage/tests/cases/assert-empty-domain-skips-storage-work
 */

import { vi } from "vitest";
import { SettingsRepository, type StorageAreaLike } from "../../../storage";

export async function assertEmptyDomainSkipsStorageWork(): Promise<void> {
  const storageArea: StorageAreaLike = {
    get: vi.fn().mockResolvedValue({}),
    set: vi.fn().mockResolvedValue(undefined)
  };
  const repository = new SettingsRepository(storageArea);

  await expect(repository.getDomainGain("")).resolves.toBeUndefined();
  await repository.setDomainGain("", 220);
  await repository.removeDomainGain("");

  expect(storageArea.get).not.toHaveBeenCalled();
  expect(storageArea.set).not.toHaveBeenCalled();
}
