/**
 * @fileoverview Builds the default persisted settings snapshot.
 * @module shared/storage/get-default-settings
 */

import { DEFAULT_ADVANCED_AUDIO_SETTINGS } from "../audio-settings";
import { DEFAULT_GAIN_PERCENT, DEFAULT_POPUP_THEME } from "../constants";
import type { ExtensionSettings } from "../types";

export function getDefaultSettings(): ExtensionSettings {
  return {
    domainGains: {},
    audioSettings: {
      global: { ...DEFAULT_ADVANCED_AUDIO_SETTINGS }
    },
    autoBoosterMode: "off",
    globalAutoGainPercent: DEFAULT_GAIN_PERCENT,
    popupTheme: DEFAULT_POPUP_THEME
  };
}
