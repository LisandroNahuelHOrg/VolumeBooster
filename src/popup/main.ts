import "./popup.css";
import "./popup-lane-buttons.css";
import "./popup-session-boost-bar.css";
import "./popup-toolbar.css";

import { initSentryForContext } from "../shared/observability/sentry";
import { SettingsRepository } from "../shared/storage";
import { bootstrapPopup } from "./internal/controller/bootstrap-popup";
import type { PopupCommandContext } from "./internal/commands/popup-command-context";
import type { PopupCommitContext } from "./internal/commits/popup-commit-context";
import { bindPopupViewportResize } from "./internal/runtime/bind-popup-viewport-resize";
import { createPopupRuntimeState } from "./internal/runtime/create-popup-runtime-state";
import { syncPopupViewportHeight } from "./internal/runtime/sync-popup-viewport-height";
import type { PopupRuntimeRefs } from "./internal/runtime/popup-runtime-types";

initSentryForContext("popup");

const appRoot = document.querySelector<HTMLDivElement>("#app");

if (!appRoot) {
  throw new Error("Popup root container was not found.");
}

const refs: PopupRuntimeRefs = {
  document,
  rootElement: appRoot,
  settingsRepository: new SettingsRepository(),
  window
};
const state = createPopupRuntimeState();
const commandContext: PopupCommandContext = { refs, state };
const commitContext: PopupCommitContext = { refs, state };

syncPopupViewportHeight(refs);
bindPopupViewportResize(refs);
void bootstrapPopup(refs, state, commandContext, commitContext);
