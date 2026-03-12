import { clampGainPercent } from "../../../shared/gain";
import { syncPopupCurrentViewModel } from "../runtime/sync-popup-current-view-model";
import type { GainVisualSyncOptions, PopupRuntimeRefs, PopupRuntimeState } from "../runtime/popup-runtime-types";

export function setPopupDraftGain(
  refs: PopupRuntimeRefs,
  state: PopupRuntimeState,
  nextValue: number,
  options: GainVisualSyncOptions = {}
): void {
  state.draftGainPercent = clampGainPercent(nextValue);
  syncPopupCurrentViewModel(refs, state, options);
}
