import type { PopupViewModel, AdvancedAudioSettings } from "../../../shared/types";

export function getVisibleAdvancedAudioSettings(
  viewModel: PopupViewModel,
  draftSettings: AdvancedAudioSettings | null,
  pendingSettings: AdvancedAudioSettings | null
): AdvancedAudioSettings {
  return draftSettings ?? pendingSettings ?? viewModel.advancedAudioSettings;
}
