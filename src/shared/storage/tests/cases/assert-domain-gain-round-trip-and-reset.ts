/**
 * @fileoverview Verifies domain gains can be stored, read back, and reset.
 * @module shared/storage/tests/cases/assert-domain-gain-round-trip-and-reset
 */

import { DEFAULT_GAIN_PERCENT, SETTINGS_STORAGE_KEY } from "../../../constants";
import { SettingsRepository } from "../../../storage";
import { createStorageArea } from "../create-storage-area";

export async function assertDomainGainRoundTripAndReset(): Promise<void> {
  const storageArea = createStorageArea();
  const repository = new SettingsRepository(storageArea);

  await expect(repository.getDomainGain(undefined)).resolves.toBeUndefined();

  await repository.setDomainGain("youtube.com", 220);
  await expect(repository.getDomainGain("youtube.com")).resolves.toBe(220);

  await repository.setDomainGain("youtube.com", DEFAULT_GAIN_PERCENT);
  await expect(repository.getDomainGain("youtube.com")).resolves.toBeUndefined();
  expect((storageArea.store[SETTINGS_STORAGE_KEY] as { domainGains: Record<string, number> }).domainGains).toEqual({});
}
