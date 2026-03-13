import { buildPopupViewModel } from "../../model";
import { createMainViewRenderModel } from "../render/create-main-view-render-model";
import { createPopupRenderContext } from "../render/create-popup-render-context";
import { renderPopupMarkup } from "../render/render-popup-markup";
import { refreshFloatingHelpTooltip } from "../dom/refresh-floating-help-tooltip";
import { restoreAppShellUiState } from "../dom/restore-app-shell-ui-state";
import { syncBoostingBackground } from "../dom/sync-boosting-background";
import { syncPopupThemeUi } from "../dom/sync-popup-theme-ui";
import type { PopupRuntimeRefs, PopupRuntimeState } from "./popup-runtime-types";
import { capturePopupRenderSnapshot } from "./capture-popup-render-snapshot";
import { createPopupRenderSignature } from "./create-popup-render-signature";
import { renderPopupErrorShell } from "./render-popup-error-shell";
import { renderPopupLoadingShell } from "./render-popup-loading-shell";
import { syncPopupCurrentViewModel } from "./sync-popup-current-view-model";

export function applyPopupRender(refs: PopupRuntimeRefs, state: PopupRuntimeState): void {
  let snapshot = capturePopupRenderSnapshot(refs);

  if (!state.currentCatalog || state.initialStateStatus === "pending") {
    syncBoostingBackground(refs.document, false);
    refs.rootElement.innerHTML = renderPopupLoadingShell();
    syncPopupThemeUi(refs.rootElement, state.popupUiState.popupTheme, state.popupUiState.currentView, null);
    restoreAppShellUiState(
      refs.rootElement,
      refs.document,
      refs.window,
      snapshot.preservedScrollTop,
      snapshot.preservedFocusedAdvancedKey
    );
    refreshFloatingHelpTooltip(refs.document, state.popupDomRuntime);
    return;
  }

  if (state.initialStateStatus === "failed" || !state.currentState) {
    syncBoostingBackground(refs.document, false);
    state.renderedSignature = "";
    refs.rootElement.innerHTML = renderPopupErrorShell(state.currentCatalog, state.transientError);
    syncPopupThemeUi(
      refs.rootElement,
      state.popupUiState.popupTheme,
      state.popupUiState.currentView,
      state.currentCatalog
    );
    restoreAppShellUiState(
      refs.rootElement,
      refs.document,
      refs.window,
      snapshot.preservedScrollTop,
      snapshot.preservedFocusedAdvancedKey
    );
    refreshFloatingHelpTooltip(refs.document, state.popupDomRuntime);
    return;
  }

  const viewModel = buildPopupViewModel(state.currentState);
  const renderContext = createPopupRenderContext({
    catalog: state.currentCatalog,
    loadedLocale: state.loadedLocale,
    popupTheme: state.popupUiState.popupTheme,
    currentView: state.popupUiState.currentView,
    draftGainPercent: state.draftGainPercent,
    draftAdvancedAudioSettings: state.draftAdvancedAudioSettings,
    pendingAdvancedAudioSettings: state.pendingAdvancedAudioSettings,
    transientError: state.transientError
  });
  const mainViewRenderResult =
    renderContext.currentView === "main"
      ? createMainViewRenderModel(viewModel, renderContext, state.sessionCarouselOffset)
      : null;

  if (mainViewRenderResult) {
    state.sessionCarouselOffset = mainViewRenderResult.nextSessionCarouselOffset;
  }

  syncBoostingBackground(refs.document, Boolean(viewModel.currentSession));
  const signature = createPopupRenderSignature(
    viewModel,
    state.popupUiState,
    state.transientError
  );

  if (signature !== state.renderedSignature) {
    snapshot = capturePopupRenderSnapshot(refs);
    refs.rootElement.innerHTML = renderPopupMarkup(renderContext, mainViewRenderResult?.model ?? null);
    state.renderedSignature = signature;
  } else {
    snapshot.shouldRestoreUiState = false;
  }

  syncPopupCurrentViewModel(refs, state);
  syncPopupThemeUi(
    refs.rootElement,
    state.popupUiState.popupTheme,
    state.popupUiState.currentView,
    state.currentCatalog
  );

  if (snapshot.shouldRestoreUiState) {
    restoreAppShellUiState(
      refs.rootElement,
      refs.document,
      refs.window,
      snapshot.preservedScrollTop,
      snapshot.preservedFocusedAdvancedKey
    );
  }

  refreshFloatingHelpTooltip(refs.document, state.popupDomRuntime);
}
