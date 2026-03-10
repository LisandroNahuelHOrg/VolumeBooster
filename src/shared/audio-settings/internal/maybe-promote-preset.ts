import type { AdvancedAudioSettings } from "../../types";
import { QUALITY_PRESET_ORDER } from "../quality-preset-order";
import { isPresetSettingsMatch } from "./is-preset-settings-match";

export function maybePromotePreset(settings: AdvancedAudioSettings): AdvancedAudioSettings {
  for (const preset of QUALITY_PRESET_ORDER) {
    if (preset !== "custom" && isPresetSettingsMatch(preset, settings)) {
      return { ...settings, qualityPreset: preset };
    }
  }

  return { ...settings, qualityPreset: "custom" };
}
