import type { AdvancedAudioSettings, WorkerState } from "../../../shared/types";
import { getVisibleBoostSettingsBundle } from "../../get-visible-boost-settings-bundle";
import { buildPopupViewModel } from "../../model";

export function createPopupCommitBoostSettingsBundle(
  currentState: WorkerState,
  gainPercent: number,
  draftAdvancedAudioSettings: AdvancedAudioSettings | null,
  pendingAdvancedAudioSettings: AdvancedAudioSettings | null
) {
  return getVisibleBoostSettingsBundle(
    buildPopupViewModel(currentState),
    gainPercent,
    draftAdvancedAudioSettings,
    pendingAdvancedAudioSettings
  );
}
