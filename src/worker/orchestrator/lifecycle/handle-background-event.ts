import { isContentEvent, isOffscreenEvent } from "../../../shared/messages";
import type { WorkerRuntimeState } from "../runtime-state";
import { handleContentEvent } from "./handle-content-event";
import { handleOffscreenEvent } from "./handle-offscreen-event";

export async function handleBackgroundEvent(
  runtime: WorkerRuntimeState,
  incomingMessage: unknown,
  sender?: chrome.runtime.MessageSender
): Promise<void> {
  if (isOffscreenEvent(incomingMessage)) {
    await handleOffscreenEvent(runtime, incomingMessage);
    return;
  }

  if (isContentEvent(incomingMessage)) {
    await handleContentEvent(runtime, incomingMessage, sender);
  }
}
