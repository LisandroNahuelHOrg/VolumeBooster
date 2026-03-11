import type { WorkerRuntimeState } from "../runtime-state";
import { replaceManualSessions } from "./replace-manual-sessions";

export async function syncFromOffscreen(runtime: WorkerRuntimeState): Promise<void> {
  const snapshot = await runtime.offscreenClient.getSnapshot();

  if (snapshot.length > 0 || runtime.manualSessions.size === 0) {
    replaceManualSessions(runtime, snapshot);
  }
}
