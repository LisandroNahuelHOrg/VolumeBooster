import type { CaptureSessionState } from "../../../shared/types";
import type { SessionMap } from "./session-manager-contract";

export const getSessionSnapshot = (sessions: SessionMap): CaptureSessionState[] =>
  [...sessions.values()].map((entry) => ({ ...entry.state }));
