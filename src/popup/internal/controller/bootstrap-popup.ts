import { message, sendMessageSafe } from "../../../shared/messages";
import { ensureExtensionUiFontFaces } from "../../../shared/ui-font-extension";
import {
  getBrowserLocale,
  loadLocaleCatalog,
  setDocumentLocaleAttributes,
  t
} from "../../../shared/runtime-i18n";
import type { WorkerState } from "../../../shared/types";
import { ensureFloatingHelpTooltip } from "../dom/ensure-floating-help-tooltip";
import { syncPopupThemeUi } from "../dom/sync-popup-theme-ui";
import type { PopupRuntimeRefs, PopupRuntimeState } from "../runtime/popup-runtime-types";
import { applyPopupRender } from "../runtime/apply-popup-render";
import { applyPopupWorkerState } from "../runtime/apply-popup-worker-state";
import { createPopupUiState } from "../../popup-ui-state";
import { bindPopupRootEvents } from "./bind-popup-root-events";
import { bindPopupMessageListener } from "./bind-popup-message-listener";
import { startPopupStatePolling } from "./start-popup-state-polling";
import type { PopupCommandContext } from "../commands/popup-command-context";
import type { PopupCommitContext } from "../commits/popup-commit-context";

export async function bootstrapPopup(
  refs: PopupRuntimeRefs,
  state: PopupRuntimeState,
  commandContext: PopupCommandContext,
  commitContext: PopupCommitContext
): Promise<void> {
  bindPopupRootEvents(refs, state, commandContext, commitContext);
  startPopupStatePolling(refs, state);
  ensureExtensionUiFontFaces(refs.document);
  state.initialStateStatus = "pending";
  state.popupUiState = createPopupUiState(await refs.settingsRepository.getPopupTheme());
  syncPopupThemeUi(refs.rootElement, state.popupUiState.popupTheme, state.popupUiState.currentView, null);
  setDocumentLocaleAttributes(refs.document);
  refs.document.title = t("popupDocumentTitle");
  applyPopupRender(refs, state);
  state.currentCatalog = await loadLocaleCatalog();
  state.loadedLocale = getBrowserLocale();
  ensureFloatingHelpTooltip(refs.document);
  applyPopupRender(refs, state);
  bindPopupMessageListener(refs, state);

  const response = await sendMessageSafe<WorkerState>({ type: "GET_STATE" });

  if (!response.ok || !response.data) {
    if (state.initialStateStatus === "pending" && !state.currentState) {
      state.initialStateStatus = "failed";
      state.transientError = response.errorMessage ?? message("errorGetState");
      applyPopupRender(refs, state);
    }
    return;
  }

  await applyPopupWorkerState(refs, state, response.data);
}
