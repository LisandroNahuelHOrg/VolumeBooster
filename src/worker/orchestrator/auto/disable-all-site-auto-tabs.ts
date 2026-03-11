import type { WorkerRuntimeState } from "../runtime-state";
import { rebuildEffectiveSessions } from "../state/rebuild-effective-sessions";

export async function disableAllSiteAutoTabs(runtime: WorkerRuntimeState): Promise<void> {
  const siteTabIds = new Set<number>([...runtime.siteEnabledAutoTabs]);

  for (const [tabId, autoState] of runtime.autoTabStates) {
    if (autoState.autoBoosterScope === "site") {
      siteTabIds.add(tabId);
    }
  }

  for (const [tabId, session] of runtime.autoSessions) {
    if (session.autoBoosterScope === "site") {
      siteTabIds.add(tabId);
    }
  }

  runtime.siteEnabledAutoTabs.clear();

  for (const tabId of siteTabIds) {
    const knownFrames = runtime.autoFrameRegistry.getKnownFrames(tabId);

    if (knownFrames.length === 0) {
      await runtime.autoBoosterClient.disable(tabId);
    } else {
      await Promise.allSettled(
        knownFrames.map((frame) =>
          runtime.autoBoosterClient.disable(tabId, {
            frameId: frame.frameId,
            documentId: frame.documentId
          })
        )
      );
    }
    runtime.autoSessions.delete(tabId);
    runtime.autoTabStates.delete(tabId);
    runtime.autoDebugStates.delete(tabId);
    runtime.autoFrameRegistry.clearTab(tabId);
    runtime.audibleTabs.delete(tabId);
  }

  rebuildEffectiveSessions(runtime);
}
