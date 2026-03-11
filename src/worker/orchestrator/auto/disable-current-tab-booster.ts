import type { WorkerRuntimeState } from "../runtime-state";
import { stopCapture } from "../manual/stop-capture";

export async function disableCurrentTabBooster(runtime: WorkerRuntimeState, tabId: number): Promise<void> {
  await stopCapture(runtime, tabId);
}
