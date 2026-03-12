import { buildPopupViewModel } from "../../model";
import { getVisibleAdvancedAudioSettings } from "../state/get-visible-advanced-audio-settings";
import type { AdvancedControlKey } from "../config/advanced-control-config";
import type { PopupRuntimeRefs, PopupRuntimeState } from "../runtime/popup-runtime-types";
import { setPopupDraftAdvancedAudioSettings } from "./set-popup-draft-advanced-audio-settings";

export function updatePopupDraftAdvancedSetting(
  state: PopupRuntimeState,
  refs: PopupRuntimeRefs,
  key: AdvancedControlKey,
  value: number
): void {
  if (!state.currentState) {
    return;
  }

  const baseSettings = getVisibleAdvancedAudioSettings(
    buildPopupViewModel(state.currentState),
    state.draftAdvancedAudioSettings,
    state.pendingAdvancedAudioSettings
  );
  setPopupDraftAdvancedAudioSettings(
    refs,
    state,
    {
      ...baseSettings,
      [key]: value,
      qualityPreset: "custom"
    }
  );
}
