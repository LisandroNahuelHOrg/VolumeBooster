import { sanitizeAdvancedAudioSettings } from "../../../shared/audio-settings";
import type { AdvancedAudioSettings } from "../../../shared/types";
import { syncPopupCurrentViewModel } from "../runtime/sync-popup-current-view-model";
import type { PopupRuntimeRefs, PopupRuntimeState } from "../runtime/popup-runtime-types";

export function setPopupDraftAdvancedAudioSettings(
  refs: PopupRuntimeRefs,
  state: PopupRuntimeState,
  nextSettings: AdvancedAudioSettings
): void {
  state.draftAdvancedAudioSettings = sanitizeAdvancedAudioSettings(nextSettings);
  syncPopupCurrentViewModel(refs, state);
}
