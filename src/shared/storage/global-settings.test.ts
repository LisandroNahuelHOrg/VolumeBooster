/**
 * @fileoverview Characterization coverage for global settings persistence helpers.
 * @module shared/storage/global-settings.test
 */

import { assertGlobalSettingsPersistence } from "./tests/cases/assert-global-settings-persistence";
import { assertGlobalSettingsSanitization } from "./tests/cases/assert-global-settings-sanitization";

describe("SettingsRepository global settings", () => {
  it("persists global auto mode, gain and merged advanced settings", assertGlobalSettingsPersistence);
  it("sanitizes writes for global mode, global gain and partial advanced settings", assertGlobalSettingsSanitization);
});
