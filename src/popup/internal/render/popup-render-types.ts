import type { UiCatalog } from "../../../shared/runtime-i18n";
import type {
  AdvancedAudioSettings,
  LocalizedMessage,
  PopupTheme,
  PopupViewModel
} from "../../../shared/types";
import type { PopupView } from "../../popup-ui-state-types";
import type { SessionCarouselModel } from "../../session-carousel";
import type { LaneStatusDescriptor } from "../status/get-lane-status";

export interface PopupRenderContext {
  catalog: UiCatalog | null;
  loadedLocale: string | null;
  popupTheme: PopupTheme;
  currentView: PopupView;
  draftGainPercent: number;
  draftAdvancedAudioSettings: AdvancedAudioSettings | null;
  pendingAdvancedAudioSettings: AdvancedAudioSettings | null;
  transientError: LocalizedMessage | null;
}

export interface PopupMainViewRenderModel {
  catalog: UiCatalog;
  loadedLocale: string | null;
  transientErrorMessage: string | null;
  currentTab: PopupViewModel["currentTab"];
  currentTabId: number | undefined;
  activeSessionsCount: number;
  advancedAudioSettings: AdvancedAudioSettings;
  draftGainPercent: number;
  currentWarning: string;
  levelPercent: number;
  laneStatus: LaneStatusDescriptor;
  siteAutoEnabled: boolean;
  globalAutoEnabled: boolean;
  sessionBoostVisible: boolean;
  sessionBoostActionBarMarkup: string;
  siteLaneButtonCopy: { action: string; mode: string };
  globalLaneButtonCopy: { action: string; mode: string };
  globalAutoAction: string;
  controlsLocked: boolean;
  protectionBypassed: boolean;
  qualityProtectorModeLabel: string;
  qualityProtectorSubtitle: string;
  qualityPresetLabel: string;
  qualityPresetSubtitle: string;
  protectionAction: string;
  clipEvents: string;
  clipEventsAlert: "danger" | "none";
  clipPeak: string;
  clipPeakAlert: "danger" | "none";
  protectionLoad: string;
  clippingSafety: string;
  clippingSafetyAlert: "danger" | "none";
  sessionCarousel: SessionCarouselModel;
}

export interface PopupMainViewRenderResult {
  model: PopupMainViewRenderModel;
  nextSessionCarouselOffset: number;
}
