import type { AudioSessionCallbacks } from "../../audio-session";
import { handleSessionTelemetry } from "./handle-session-telemetry";
import { handleSessionRuntimeFatalError } from "./handle-session-runtime-fatal-error";
import type { OffscreenSessionManagerRuntime } from "./session-manager-contract";

export const createSessionCallbacks = (
  runtime: OffscreenSessionManagerRuntime,
  tabId: number
): AudioSessionCallbacks => ({
  onTelemetry: handleSessionTelemetry.bind(undefined, runtime.sessions, tabId),
  onFatalError: handleSessionRuntimeFatalError.bind(undefined, runtime, tabId)
});
