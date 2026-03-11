/**
 * @fileoverview Requests the global host permission through the worker.
 * @module automation/request-global-permission
 */

import { sendMessageSafe } from "../shared/messages";
import type { WorkerState } from "../shared/types";

/**
 * Requests all-sites access and returns the updated worker state when granted.
 */
export async function requestGlobalPermission(): Promise<WorkerState | null> {
  const response = await sendMessageSafe<WorkerState>({ type: "REQUEST_GLOBAL_PERMISSION" });
  return response.ok ? response.data ?? null : null;
}
