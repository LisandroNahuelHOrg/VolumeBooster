import type { LocalizedMessage } from "../../../shared/types";
import { handleSessionFatalError } from "./handle-session-fatal-error";
import type { OffscreenSessionManagerRuntime } from "./session-manager-contract";

export const handleSessionRuntimeFatalError = (
  runtime: OffscreenSessionManagerRuntime,
  tabId: number,
  errorMessage: LocalizedMessage
): void => {
  void handleSessionFatalError(runtime.sessions, tabId, errorMessage, runtime.now);
};
