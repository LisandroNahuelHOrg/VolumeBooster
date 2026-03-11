/**
 * @fileoverview Reads the visible extension state from the worker.
 * @module automation/get-automation-state
 */

import type { WorkerState } from "../shared/types";
import { getAutomationStateDetailed } from "./get-automation-state-detailed";

/**
 * Lee el estado visible de la extensión desde el worker.
 */
export async function getAutomationState(): Promise<WorkerState | null> {
  const response = await getAutomationStateDetailed();
  return response.ok ? response.data ?? null : null;
}
