import type { WorkerRuntimeState } from "../runtime-state";

export function pruneAudibleTabs(runtime: WorkerRuntimeState): void {
  for (const [tabId, audibleUntil] of runtime.audibleTabs) {
    const currentSession = runtime.sessions.get(tabId);

    if (!currentSession || currentSession.streamState !== "active" || audibleUntil <= runtime.now()) {
      runtime.audibleTabs.delete(tabId);
    }
  }
}
