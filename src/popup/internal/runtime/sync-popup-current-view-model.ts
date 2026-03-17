import { buildPopupViewModel } from "../../model";
import { createPopupRenderContext } from "../render/create-popup-render-context";
import { createPopupDynamicUiModel } from "../sync/create-popup-dynamic-ui-model";
import { syncPopupDynamicUi } from "../sync/sync-popup-dynamic-ui";
import type { GainVisualSyncOptions, PopupRuntimeRefs, PopupRuntimeState } from "./popup-runtime-types";
import { applyPopupRender } from "./apply-popup-render";

export function syncPopupCurrentViewModel(
  refs: PopupRuntimeRefs,
  state: PopupRuntimeState,
  options: GainVisualSyncOptions = {}
): void {
  if (!state.currentState || !state.currentCatalog) {
    applyPopupRender(refs, state);
    return;
  }

  const viewModel = buildPopupViewModel(state.currentState);
  const isLifetimePremiumActive =
    viewModel.premiumEntitlement.status === "active" && viewModel.premiumEntitlement.source === "license";

  syncPopupDynamicUi(
    refs.rootElement,
    createPopupDynamicUiModel({
      viewModel,
      renderContext: createPopupRenderContext({
        catalog: state.currentCatalog,
        loadedLocale: state.loadedLocale,
        popupTheme: state.popupUiState.popupTheme,
        currentView: state.popupUiState.currentView,
        isLifetimePremiumActive,
        draftGainPercent: state.draftGainPercent,
        draftAdvancedAudioSettings: state.draftAdvancedAudioSettings,
        pendingAdvancedAudioSettings: state.pendingAdvancedAudioSettings,
        premiumEmailDraft: state.premiumEmailDraft,
        premiumLicenseDraft: state.premiumLicenseDraft,
        transientError: state.transientError
      }),
      sessionBoostAcknowledgedAction: state.sessionBoostAcknowledgedAction,
      sessionCarouselOffset: state.sessionCarouselOffset
    }),
    state.popupUiSyncRuntime,
    state.popupDomRuntime,
    options.animateVisuals ?? false
  );
}
