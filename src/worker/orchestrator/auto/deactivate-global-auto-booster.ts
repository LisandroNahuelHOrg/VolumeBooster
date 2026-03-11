import type { WorkerRuntimeState } from "../runtime-state";
import { rebuildEffectiveSessions } from "../state/rebuild-effective-sessions";
import { unregisterGlobalContentScripts } from "./unregister-global-content-scripts";

export async function deactivateGlobalAutoBooster(runtime: WorkerRuntimeState): Promise<void> {
  runtime.autoBoosterMode = await runtime.settingsRepository.setAutoBoosterMode("off");
  runtime.autoSuppressedTabs.clear();
  await unregisterGlobalContentScripts(runtime);

  const globalTabIds = new Set<number>();

  for (const [tabId, autoState] of runtime.autoTabStates) {
    if (autoState.autoBoosterScope === "global") {
      globalTabIds.add(tabId);
    }
  }

  for (const [tabId, session] of runtime.autoSessions) {
    if (session.autoBoosterScope === "global") {
      globalTabIds.add(tabId);
    }
  }

  for (const tabId of globalTabIds) {
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
  }

  rebuildEffectiveSessions(runtime);
}
