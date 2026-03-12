import { DEFAULT_GAIN_PERCENT } from "../../../shared/constants";
import { createPopupUiState } from "../../popup-ui-state";
import type { PopupRuntimeState } from "./popup-runtime-types";

export function createPopupRuntimeState(): PopupRuntimeState {
  return {
    advancedCommitInFlight: false,
    advancedCommitTimer: null,
    currentCatalog: null,
    currentState: null,
    draftAdvancedAudioSettings: null,
    draftGainPercent: DEFAULT_GAIN_PERCENT,
    gainCommitInFlight: false,
    gainCommitTimer: null,
    initialStateStatus: "pending",
    isAdjustingAdvancedSettings: false,
    isAdjustingGain: false,
    loadedLocale: null,
    pendingAdvancedAudioSettings: null,
    pendingGainPercent: null,
    popupDomRuntime: {
      activeHelpTooltipAnchor: null,
      tooltipRefreshFrame: null,
      gainSliderAnimationFrame: null,
      gainSliderAnimationTarget: null,
      visualGainPercent: DEFAULT_GAIN_PERCENT,
      laneLayoutTransitionTimer: null
    },
    popupGainPointerRuntime: {
      pendingGainTrackJumpAnimationAt: 0,
      pendingGainTrackJumpPointerId: null,
      pendingGainTrackJumpStartX: null,
      pendingGainTrackJumpMoved: false
    },
    popupThemePersistQueue: Promise.resolve(),
    popupUiState: createPopupUiState("dark"),
    popupUiSyncRuntime: {
      lastProtectorTelemetryUiAt: 0,
      lastProtectorTelemetryDisplayKey: "",
      lastLaneStatusDisplayKey: ""
    },
    renderedSignature: "",
    rootEventsBound: false,
    sessionCarouselOffset: 0,
    statePollTimer: null,
    transientError: null
  };
}
