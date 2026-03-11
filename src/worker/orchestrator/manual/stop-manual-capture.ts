import type { WorkerRuntimeState } from "../runtime-state";
import { replaceManualSessions } from "./replace-manual-sessions";

export async function stopManualCapture(runtime: WorkerRuntimeState, tabId: number): Promise<void> {
  const snapshot = await runtime.offscreenClient.stopSession(tabId);
  replaceManualSessions(runtime, snapshot);
  await runtime.offscreenClient.closeIfIdle(snapshot.length);
}
