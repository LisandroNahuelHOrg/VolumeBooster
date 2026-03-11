/**
 * @fileoverview Reads the full visible extension state from the worker.
 * @module automation/get-automation-state-detailed
 */

import type { RuntimeResponse, WorkerState } from "../shared/types";
import { sendAutomationCommandDetailed } from "./send-automation-command-detailed";

/**
 * Lee el estado completo de la extensión incluyendo metadatos de error.
 */
export async function getAutomationStateDetailed(): Promise<RuntimeResponse<WorkerState>> {
  return sendAutomationCommandDetailed<WorkerState>({ type: "GET_STATE" });
}
