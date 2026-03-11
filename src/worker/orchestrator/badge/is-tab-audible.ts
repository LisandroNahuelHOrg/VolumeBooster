import type { WorkerRuntimeState } from "../runtime-state";

export function isTabAudible(runtime: WorkerRuntimeState, tabId: number): boolean {
  const currentSession = runtime.sessions.get(tabId);

  if (!currentSession || currentSession.streamState !== "active") {
    return false;
  }

  return (runtime.audibleTabs.get(tabId) ?? 0) > runtime.now();
}
