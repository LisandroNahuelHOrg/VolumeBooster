/**
 * @fileoverview Bootstraps the automation bridge page side effects.
 * @module automation/bootstrap-automation-bridge
 */

import { initSentryForContext } from "../shared/observability/sentry";
import { setDocumentLocaleAttributes, t } from "../shared/runtime-i18n";
import { ensureExtensionUiFontFaces } from "../shared/ui-font-extension";
import { bindPermissionButton } from "./bind-permission-button";
import { createAutomationBridge } from "./create-automation-bridge";
import { renderAutomationBridge } from "./render-automation-bridge";

/**
 * Initializes the dedicated automation page and exposes its bridge on window.
 */
export function bootstrapAutomationBridge(
  doc: Document = document,
  win: Window = window
): void {
  initSentryForContext("automation");

  const root = doc.querySelector<HTMLDivElement>("#app");

  if (!root) {
    throw new Error("Automation root not found.");
  }

  ensureExtensionUiFontFaces(doc);
  setDocumentLocaleAttributes(doc);
  doc.title = t("automationDocumentTitle");
  root.innerHTML = renderAutomationBridge();

  const bridge = createAutomationBridge();
  bindPermissionButton(root, bridge.requestGlobalPermission);
  win.__PRISM_AUTOMATION__ = bridge;
}
