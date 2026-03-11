import type { LocalizedMessage, WorkerState } from "../types";

/** Events emitted by the worker back to popup listeners. */
export type WorkerEvent =
  | { type: "WORKER_STATE_UPDATE"; payload: WorkerState }
  | { type: "WORKER_ERROR"; payload: { message: LocalizedMessage; tabId?: number } };
