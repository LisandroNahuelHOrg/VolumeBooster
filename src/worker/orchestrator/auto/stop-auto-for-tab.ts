import type { WorkerRuntimeState } from "../runtime-state";
import { getAutoScopeForTab } from "../state/get-auto-scope-for-tab";
import { rebuildEffectiveSessions } from "../state/rebuild-effective-sessions";

export async function stopAutoForTab(runtime: WorkerRuntimeState, tabId: number): Promise<void> {
  const scope = getAutoScopeForTab(runtime, tabId);

  if (scope === "site") {
    runtime.siteEnabledAutoTabs.delete(tabId);
  } else if (scope === "global") {
    runtime.autoSuppressedTabs.add(tabId);
  }

  const knownFrames = runtime.autoFrameRegistry.getKnownFrames(tabId);

  if (knownFrames.length === 0) {
    await runtime.autoBoosterClient.disable(tabId);
  } else {
    await Promise.allSettled(
      knownFrames.map((frame) =>
        runtime.autoBoosterClient.disable(tabId, { frameId: frame.frameId, documentId: frame.documentId })
      )
    );
  }
  runtime.autoSessions.delete(tabId);
  runtime.autoTabStates.delete(tabId);
  runtime.autoDebugStates.delete(tabId);
  runtime.autoFrameRegistry.clearTab(tabId);
  runtime.audibleTabs.delete(tabId);
  rebuildEffectiveSessions(runtime);
}
