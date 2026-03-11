/**
 * @fileoverview Sends popup commands to the worker preserving the full contract.
 * @module automation/send-automation-command-detailed
 */

import { sendMessageSafe } from "../shared/messages";
import type { PopupCommand } from "../shared/messages";
import type { RuntimeResponse } from "../shared/types";

/**
 * Envía un comando del popup al worker y conserva el contrato completo de
 * respuesta para escenarios de diagnóstico.
 */
export async function sendAutomationCommandDetailed<T = unknown>(
  command: PopupCommand
): Promise<RuntimeResponse<T>> {
  return sendMessageSafe<T>(command);
}
