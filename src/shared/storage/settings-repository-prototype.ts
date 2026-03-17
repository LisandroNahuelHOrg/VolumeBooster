/**
 * @fileoverview Prototype wiring for the settings repository public surface.
 * @module shared/storage/settings-repository-prototype
 */

import { clearPremiumLicenseActivation } from "./clear-premium-license-activation";
import { clearDomainBoostSettingsBundles } from "./clear-domain-boost-settings-bundles";
import type { SettingsRepositoryApi } from "./contracts";
import { getAdvancedAudioSettings } from "./get-advanced-audio-settings";
import { getAutoBoosterMode } from "./get-auto-booster-mode";
import { getDomainBoostSettingsBundle } from "./get-domain-boost-settings-bundle";
import { getDomainGain } from "./get-domain-gain";
import { getGlobalBoostSettingsBundle } from "./get-global-boost-settings-bundle";
import { getGlobalAutoGainPercent } from "./get-global-auto-gain-percent";
import { getPopupTheme } from "./get-popup-theme";
import { getPremiumLicenseActivation } from "./get-premium-license-activation";
import { getSettings } from "./get-settings";
import { removeDomainBoostSettingsBundle } from "./remove-domain-boost-settings-bundle";
import { removeDomainGain } from "./remove-domain-gain";
import { setAdvancedAudioSettings } from "./set-advanced-audio-settings";
import { setAutoBoosterMode } from "./set-auto-booster-mode";
import { setDomainBoostSettingsBundle } from "./set-domain-boost-settings-bundle";
import { setDomainGain } from "./set-domain-gain";
import { setGlobalBoostSettingsBundle } from "./set-global-boost-settings-bundle";
import { setGlobalAutoGainPercent } from "./set-global-auto-gain-percent";
import { setPopupTheme } from "./set-popup-theme";
import { setPremiumLicenseActivation } from "./set-premium-license-activation";

export const settingsRepositoryPrototype: SettingsRepositoryApi = {
  getSettings,
  getDomainGain,
  getDomainBoostSettingsBundle,
  getGlobalBoostSettingsBundle,
  setDomainGain,
  setDomainBoostSettingsBundle,
  removeDomainGain,
  removeDomainBoostSettingsBundle,
  clearDomainBoostSettingsBundles,
  getAdvancedAudioSettings,
  getAutoBoosterMode,
  getGlobalAutoGainPercent,
  getPopupTheme,
  getPremiumLicenseActivation,
  setAutoBoosterMode,
  setGlobalAutoGainPercent,
  setGlobalBoostSettingsBundle,
  setPopupTheme,
  setPremiumLicenseActivation,
  clearPremiumLicenseActivation,
  setAdvancedAudioSettings
};
