/**
 * @fileoverview Characterization coverage for loading and sanitizing settings.
 * @module shared/storage/get-settings.test
 */

import { assertDefaultsWhenStorageIsEmptyOrInvalid } from "./tests/cases/assert-defaults-when-storage-is-empty-or-invalid";
import { assertDropsInvalidPersistedDomainGains } from "./tests/cases/assert-drops-invalid-persisted-domain-gains";
import { assertInvalidAutoModeAndGainFallbacks } from "./tests/cases/assert-invalid-auto-mode-and-gain-fallbacks";
import { assertMissingNestedAudioSettingsAreSanitized } from "./tests/cases/assert-missing-nested-audio-settings-are-sanitized";
import { assertPersistedSettingsAreSanitized } from "./tests/cases/assert-persisted-settings-are-sanitized";

describe("SettingsRepository getSettings", () => {
  it("returns defaults when storage is empty or invalid", assertDefaultsWhenStorageIsEmptyOrInvalid);
  it("sanitizes object-shaped settings that omit nested audio settings", assertMissingNestedAudioSettingsAreSanitized);
  it("sanitizes persisted domain gains, audio settings and global mode", assertPersistedSettingsAreSanitized);
  it("forces invalid persisted auto mode and gain back to safe defaults", assertInvalidAutoModeAndGainFallbacks);
  it("drops non-finite and non-numeric persisted domain gains", assertDropsInvalidPersistedDomainGains);
});
