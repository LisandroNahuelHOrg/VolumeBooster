/**
 * @fileoverview Prototype wiring for the settings repository public surface.
 * @module shared/storage/settings-repository-prototype
 */

import type { SettingsRepositoryApi } from "./contracts";
import { getAdvancedAudioSettings } from "./get-advanced-audio-settings";
import { getAutoBoosterMode } from "./get-auto-booster-mode";
import { getDomainGain } from "./get-domain-gain";
import { getGlobalAutoGainPercent } from "./get-global-auto-gain-percent";
import { getPopupTheme } from "./get-popup-theme";
import { getSettings } from "./get-settings";
import { removeDomainGain } from "./remove-domain-gain";
import { setAdvancedAudioSettings } from "./set-advanced-audio-settings";
import { setAutoBoosterMode } from "./set-auto-booster-mode";
import { setDomainGain } from "./set-domain-gain";
import { setGlobalAutoGainPercent } from "./set-global-auto-gain-percent";
import { setPopupTheme } from "./set-popup-theme";

export const settingsRepositoryPrototype: SettingsRepositoryApi = {
  getSettings,
  getDomainGain,
  setDomainGain,
  removeDomainGain,
  getAdvancedAudioSettings,
  getAutoBoosterMode,
  getGlobalAutoGainPercent,
  getPopupTheme,
  setAutoBoosterMode,
  setGlobalAutoGainPercent,
  setPopupTheme,
  setAdvancedAudioSettings
};
