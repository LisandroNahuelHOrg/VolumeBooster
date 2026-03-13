import type { BoostSettingsBundle } from "../shared/boost-settings";
import { areBoostSettingsBundlesEqual } from "../shared/boost-settings";
import type { AdvancedAudioSettings, PopupViewModel } from "../shared/types";
import type { PopupView } from "./popup-ui-state-types";
import { getVisibleBoostSettingsBundle } from "./get-visible-boost-settings-bundle";
import { shouldShowSessionBoostActionBar } from "./should-show-session-boost-action-bar";

export function resolveSessionBoostBarState(
  viewModel: PopupViewModel,
  options: {
    currentView: PopupView;
    draftGainPercent: number;
    draftAdvancedAudioSettings: AdvancedAudioSettings | null;
    pendingAdvancedAudioSettings: AdvancedAudioSettings | null;
    hiddenLocally?: boolean;
  }
): { activeBundle: BoostSettingsBundle; hasLocalPendingDraft: boolean; visible: boolean } {
  const activeBundle = getVisibleBoostSettingsBundle(
    viewModel,
    options.draftGainPercent,
    options.draftAdvancedAudioSettings,
    options.pendingAdvancedAudioSettings
  );
  const baselineBundle = viewModel.boostSettingsBundle ?? {
    gainPercent: viewModel.gainPercent,
    advancedAudioSettings: viewModel.advancedAudioSettings
  };
  const hasLocalPendingDraft = !areBoostSettingsBundlesEqual(activeBundle, baselineBundle);

  return {
    activeBundle,
    hasLocalPendingDraft,
    visible: shouldShowSessionBoostActionBar(
      viewModel,
      options.currentView === "settings",
      options.hiddenLocally === true,
      hasLocalPendingDraft
    )
  };
}
