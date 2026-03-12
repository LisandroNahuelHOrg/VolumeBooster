import { getBrowserLocale, loadLocaleCatalog, setDocumentLocaleAttributes, t } from "../../../shared/runtime-i18n";
import type { WorkerState } from "../../../shared/types";
import { buildPopupViewModel } from "../../model";
import { areAdvancedSettingsEqual } from "../state/are-advanced-settings-equal";
import { didTabContextChange } from "../state/did-tab-context-change";
import { applyPopupRender } from "./apply-popup-render";
import type { PopupRuntimeRefs, PopupRuntimeState } from "./popup-runtime-types";

export async function applyPopupWorkerState(
  refs: PopupRuntimeRefs,
  state: PopupRuntimeState,
  nextState: WorkerState
): Promise<void> {
  const previousState = state.currentState;
  state.currentState = nextState;
  state.initialStateStatus = "ready";
  const autoLocale = getBrowserLocale();

  if (!state.currentCatalog || state.loadedLocale !== autoLocale) {
    setDocumentLocaleAttributes(refs.document, autoLocale);
    refs.document.title = t("popupDocumentTitle");
    state.currentCatalog = await loadLocaleCatalog(autoLocale);
    state.loadedLocale = autoLocale;
    state.renderedSignature = "";
  }

  const viewModel = buildPopupViewModel(nextState);
  const actualGain = viewModel.gainPercent;
  const tabContextChanged = didTabContextChange(previousState, nextState);
  const sessionBoostPromptResolved =
    previousState?.sessionBoostPromptState?.hasUnsavedChanges === true &&
    nextState.sessionBoostPromptState?.hasUnsavedChanges !== true;

  if (state.pendingGainPercent !== null) {
    if (!viewModel.currentSession || actualGain === state.pendingGainPercent) {
      state.pendingGainPercent = null;
    }
  }

  if (
    !state.isAdjustingGain &&
    state.pendingGainPercent === null &&
    (previousState === null ||
      tabContextChanged ||
      viewModel.currentSession ||
      sessionBoostPromptResolved)
  ) {
    state.draftGainPercent = actualGain;
  }

  if (
    state.pendingAdvancedAudioSettings &&
    areAdvancedSettingsEqual(state.pendingAdvancedAudioSettings, nextState.advancedAudioSettings)
  ) {
    state.pendingAdvancedAudioSettings = null;
  }

  if (!state.isAdjustingAdvancedSettings && state.pendingAdvancedAudioSettings === null) {
    state.draftAdvancedAudioSettings = { ...nextState.advancedAudioSettings };
  }

  applyPopupRender(refs, state);
}
