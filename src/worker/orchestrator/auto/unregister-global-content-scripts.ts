import type { WorkerRuntimeState } from "../runtime-state";

export async function unregisterGlobalContentScripts(runtime: WorkerRuntimeState): Promise<void> {
  if (typeof runtime.autoBoosterClient.unregisterGlobalContentScripts === "function") {
    await runtime.autoBoosterClient.unregisterGlobalContentScripts();
  }
}
