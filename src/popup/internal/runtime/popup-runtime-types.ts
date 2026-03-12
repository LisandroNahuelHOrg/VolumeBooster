import type { UiCatalog } from "../../../shared/runtime-i18n";
import type {
  AdvancedAudioSettings,
  LocalizedMessage,
  PopupTheme,
  WorkerState
} from "../../../shared/types";
import type { PopupUiState } from "../../popup-ui-state-types";
import type {
  PopupDomRuntime,
  PopupGainPointerRuntime
} from "../dom/popup-dom-runtime-types";
import type { PopupUiSyncRuntime } from "../sync/popup-dynamic-ui-types";

export interface GainVisualSyncOptions {
  animateVisuals?: boolean;
}

export interface PopupSettingsRepository {
  getPopupTheme(): Promise<PopupTheme>;
  setPopupTheme(theme: PopupTheme): Promise<PopupTheme>;
}

export interface PopupRuntimeRefs {
  document: Document;
  rootElement: HTMLDivElement;
  settingsRepository: PopupSettingsRepository;
  window: Window & typeof globalThis;
}

export interface PopupRenderSnapshot {
  preservedFocusedAdvancedKey: string | null;
  preservedScrollTop: number;
  shouldRestoreUiState: boolean;
}

export type PopupInitialStateStatus = "pending" | "ready" | "failed";

export interface PopupRuntimeState {
  advancedCommitInFlight: boolean;
  advancedCommitTimer: number | null;
  currentCatalog: UiCatalog | null;
  currentState: WorkerState | null;
  draftAdvancedAudioSettings: AdvancedAudioSettings | null;
  draftGainPercent: number;
  gainCommitInFlight: boolean;
  gainCommitTimer: number | null;
  initialStateStatus: PopupInitialStateStatus;
  isAdjustingAdvancedSettings: boolean;
  isAdjustingGain: boolean;
  loadedLocale: string | null;
  pendingAdvancedAudioSettings: AdvancedAudioSettings | null;
  pendingGainPercent: number | null;
  popupDomRuntime: PopupDomRuntime;
  popupGainPointerRuntime: PopupGainPointerRuntime;
  popupThemePersistQueue: Promise<void>;
  popupUiState: PopupUiState;
  popupUiSyncRuntime: PopupUiSyncRuntime;
  renderedSignature: string;
  rootEventsBound: boolean;
  sessionBoostAcknowledgedAction: string | null;
  sessionCarouselOffset: number;
  statePollTimer: number | null;
  transientError: LocalizedMessage | null;
}
