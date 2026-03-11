import type {
  LevelUpdatePayload,
  SessionStatusPayload,
  WorkerState
} from "../types";

/** Events emitted by the offscreen document toward the worker. */
export type OffscreenEvent =
  | { type: "SESSION_LEVEL_UPDATE"; payload: LevelUpdatePayload }
  | { type: "SESSION_STATUS_UPDATE"; payload: SessionStatusPayload }
  | { type: "OFFSCREEN_SNAPSHOT"; payload: { sessions: WorkerState["sessions"] } };
