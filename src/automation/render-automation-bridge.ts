/**
 * @fileoverview Renders the automation bridge page markup.
 * @module automation/render-automation-bridge
 */

import { t } from "../shared/runtime-i18n";
import { UI_FONT_STACK } from "../shared/ui-font-stack";

/**
 * Renders the dedicated extension page used by automation tooling.
 */
export function renderAutomationBridge(): string {
  return `
    <main style="font-family: ${UI_FONT_STACK}; padding: 20px; color: #f4f6f8; background: #0f1720; min-height: 100vh; -webkit-font-smoothing: antialiased;">
      <h1 style="margin: 0 0 12px; font-size: 21px; font-weight: 700; line-height: 1.1; letter-spacing: -0.025em;">${t("automationBridgeTitle")}</h1>
      <p style="margin: 0 0 16px; line-height: 1.6; font-size: 14px; font-weight: 500; color: #c6d3dd;">
        ${t("automationBridgeBody")}
      </p>
      <button
        type="button"
        data-action="request-global-permission"
        style="padding: 12px 16px; border-radius: 12px; border: 1px solid rgba(255,255,255,0.2); background: #1d6bff; color: white; font-family: ${UI_FONT_STACK}; font-size: 13px; font-weight: 700; letter-spacing: 0.04em; text-transform: uppercase; cursor: pointer;"
      >
        ${t("automationRestoreAllSitesAccess")}
      </button>
      <pre data-role="output" style="margin-top: 16px; white-space: pre-wrap; background: rgba(255,255,255,0.06); padding: 12px; border-radius: 12px; font-family: ${UI_FONT_STACK}; font-size: 12px; line-height: 1.5;"></pre>
    </main>
  `;
}
