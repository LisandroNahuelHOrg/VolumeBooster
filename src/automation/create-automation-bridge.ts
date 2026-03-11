/**
 * @fileoverview Composes the public automation bridge exposed on window.
 * @module automation/create-automation-bridge
 */

import type { PrismAutomationBridge } from "./automation-bridge-types";
import { getAutomationActiveTab } from "./get-automation-active-tab";
import { getAutomationDebugState } from "./get-automation-debug-state";
import { getAutomationDebugStateDetailed } from "./get-automation-debug-state-detailed";
import { getAutomationState } from "./get-automation-state";
import { getAutomationStateDetailed } from "./get-automation-state-detailed";
import { getAutomationTabsByUrl } from "./get-automation-tabs-by-url";
import { hasGlobalPermission } from "./has-global-permission";
import { requestGlobalPermission } from "./request-global-permission";
import { sendAutomationCommand } from "./send-automation-command";
import { sendAutomationCommandDetailed } from "./send-automation-command-detailed";

/**
 * Creates the automation bridge object assigned to `window.__PRISM_AUTOMATION__`.
 */
export function createAutomationBridge(): PrismAutomationBridge {
  return {
    requestGlobalPermission,
    hasGlobalPermission,
    sendCommand: sendAutomationCommand,
    sendCommandDetailed: sendAutomationCommandDetailed,
    getState: getAutomationState,
    getStateDetailed: getAutomationStateDetailed,
    getDebugState: getAutomationDebugState,
    getDebugStateDetailed: getAutomationDebugStateDetailed,
    getActiveTab: getAutomationActiveTab,
    getTabsByUrl: getAutomationTabsByUrl
  };
}
