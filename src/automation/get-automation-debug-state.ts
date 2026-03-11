/**
 * @fileoverview Reads the unwrapped auto-booster debug payload for a tab.
 * @module automation/get-automation-debug-state
 */

import type { AutoBoosterDebugState } from "../shared/types";
import { getAutomationDebugStateDetailed } from "./get-automation-debug-state-detailed";

/**
 * Solicita el estado de depuración del auto-booster para una pestaña
 * específica.
 */
export async function getAutomationDebugState(
  tabId: number
): Promise<AutoBoosterDebugState | null> {
  const response = await getAutomationDebugStateDetailed(tabId);
  return response.ok ? response.data ?? null : null;
}
