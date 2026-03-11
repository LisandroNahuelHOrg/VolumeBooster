import type { WorkerRuntimeState } from "../runtime-state";
import { broadcastState } from "../state/broadcast-state";
import { replaceManualSessions } from "./replace-manual-sessions";
import { stopAutoForTab } from "../auto/stop-auto-for-tab";

export async function stopAll(runtime: WorkerRuntimeState): Promise<void> {
  if (runtime.manualSessions.size > 0) {
    const snapshot = await runtime.offscreenClient.stopAll();
    replaceManualSessions(runtime, snapshot);
    await runtime.offscreenClient.closeIfIdle(snapshot.length);
  }

  const autoTabIds = new Set<number>([
    ...runtime.autoSessions.keys(),
    ...runtime.autoTabStates.keys(),
    ...runtime.siteEnabledAutoTabs.values()
  ]);

  for (const tabId of autoTabIds) {
    await stopAutoForTab(runtime, tabId);
  }

  await broadcastState(runtime);
}
