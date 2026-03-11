/**
 * @fileoverview Reads the full auto-booster debug payload for a tab.
 * @module automation/get-automation-debug-state-detailed
 */

import type { AutoBoosterDebugState, RuntimeResponse } from "../shared/types";
import { sendAutomationCommandDetailed } from "./send-automation-command-detailed";

/**
 * Solicita el estado de depuración completo del auto-booster para una pestaña.
 */
export async function getAutomationDebugStateDetailed(
  tabId: number
): Promise<RuntimeResponse<AutoBoosterDebugState | null>> {
  return sendAutomationCommandDetailed<AutoBoosterDebugState | null>({
    type: "GET_DEBUG_STATE",
    payload: { tabId }
  });
}
