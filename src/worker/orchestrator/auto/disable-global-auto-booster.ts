import type { WorkerRuntimeState } from "../runtime-state";
import { broadcastState } from "../state/broadcast-state";
import { deactivateGlobalAutoBooster } from "./deactivate-global-auto-booster";

export async function disableGlobalAutoBooster(runtime: WorkerRuntimeState): Promise<void> {
  await deactivateGlobalAutoBooster(runtime);
  await broadcastState(runtime);
}
