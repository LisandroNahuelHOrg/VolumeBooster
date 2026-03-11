/**
 * @fileoverview Sends popup commands to the worker and unwraps successful data.
 * @module automation/send-automation-command
 */

import type { PopupCommand } from "../shared/messages";
import { sendAutomationCommandDetailed } from "./send-automation-command-detailed";

/**
 * Envía un comando del popup al worker y devuelve solo la carga útil en caso
 * de éxito.
 */
export async function sendAutomationCommand<T = unknown>(
  command: PopupCommand
): Promise<T | null> {
  const response = await sendAutomationCommandDetailed<T>(command);
  return response.ok ? response.data ?? null : null;
}
