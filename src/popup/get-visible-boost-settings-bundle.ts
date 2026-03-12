import type { BoostSettingsBundle } from "../shared/boost-settings";
import type { AdvancedAudioSettings, PopupViewModel } from "../shared/types";

export function getVisibleBoostSettingsBundle(
  viewModel: PopupViewModel,
  draftGainPercent: number,
  draftAdvancedAudioSettings: AdvancedAudioSettings | null,
  pendingAdvancedAudioSettings: AdvancedAudioSettings | null
): BoostSettingsBundle {
  return {
    gainPercent: draftGainPercent,
    advancedAudioSettings:
      draftAdvancedAudioSettings ??
      pendingAdvancedAudioSettings ??
      viewModel.boostSettingsBundle?.advancedAudioSettings ??
      viewModel.advancedAudioSettings
  };
}
