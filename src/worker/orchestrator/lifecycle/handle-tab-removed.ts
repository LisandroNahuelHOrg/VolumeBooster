import type { WorkerRuntimeState } from "../runtime-state";
import { broadcastState } from "../state/broadcast-state";
import { rebuildEffectiveSessions } from "../state/rebuild-effective-sessions";
import { stopManualCapture } from "../manual/stop-manual-capture";

export async function handleTabRemoved(runtime: WorkerRuntimeState, tabId: number): Promise<void> {
  if (runtime.manualSessions.has(tabId)) {
    await stopManualCapture(runtime, tabId);
  }

  runtime.siteEnabledAutoTabs.delete(tabId);
  runtime.autoSuppressedTabs.delete(tabId);
  runtime.autoSessions.delete(tabId);
  runtime.autoTabStates.delete(tabId);
  runtime.autoDebugStates.delete(tabId);
  runtime.autoFrameRegistry.clearTab(tabId);
  rebuildEffectiveSessions(runtime);
  await broadcastState(runtime);
}
