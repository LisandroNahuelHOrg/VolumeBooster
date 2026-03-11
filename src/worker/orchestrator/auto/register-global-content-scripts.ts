import type { WorkerRuntimeState } from "../runtime-state";

export async function registerGlobalContentScripts(runtime: WorkerRuntimeState): Promise<void> {
  if (typeof runtime.autoBoosterClient.registerGlobalContentScripts === "function") {
    await runtime.autoBoosterClient.registerGlobalContentScripts();
  }
}
