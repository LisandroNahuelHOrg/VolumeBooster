import type { WorkerRuntimeState } from "../runtime-state";
import { stopAutoForTab } from "../auto/stop-auto-for-tab";
import { resumeAutoLaneIfNeeded } from "../auto/resume-auto-lane-if-needed";
import { broadcastState } from "../state/broadcast-state";
import { stopManualCapture } from "./stop-manual-capture";

export async function stopCapture(runtime: WorkerRuntimeState, tabId: number): Promise<void> {
  if (runtime.manualSessions.has(tabId)) {
    await stopManualCapture(runtime, tabId);
    await resumeAutoLaneIfNeeded(runtime, tabId);
    await broadcastState(runtime);
    return;
  }

  if (runtime.autoSessions.has(tabId) || runtime.autoTabStates.has(tabId) || runtime.siteEnabledAutoTabs.has(tabId)) {
    await stopAutoForTab(runtime, tabId);
    await broadcastState(runtime);
  }
}
