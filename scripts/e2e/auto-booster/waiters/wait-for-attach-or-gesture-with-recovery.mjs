import { getDebugState } from "../runtime/get-debug-state.mjs";
import { wait } from "./wait.mjs";

export async function waitForAttachOrGestureWithRecovery(input) {
  const deadline = Date.now() + (input.timeoutMs ?? 15000);
  const allowAwaitingGesture = input.allowAwaitingGesture === true;
  let playbackStarted = false;
  let recoveryObserved = false;
  let playbackNeedsRetry = true;
  let finalDebug = await getDebugState(input.automationPage, input.tabId);

  while (Date.now() < deadline) {
    if (playbackNeedsRetry) {
      try {
        playbackStarted = (await input.startPlayback(input.page)) || playbackStarted;
      } catch {
        // Ignore playback kick failures; state polling decides the outcome.
      }

      playbackNeedsRetry = false;
    }

    finalDebug = await getDebugState(input.automationPage, input.tabId);

    if (finalDebug?.attachState === "attached") {
      return { finalDebug, playbackStarted, recoveryObserved };
    }

    if (allowAwaitingGesture && finalDebug?.attachState === "awaiting_user_gesture") {
      return { finalDebug, playbackStarted, recoveryObserved };
    }

    if (finalDebug?.recoveryPending && !recoveryObserved) {
      recoveryObserved = true;
      playbackNeedsRetry = true;

      try {
        await input.page.waitForLoadState("domcontentloaded", { timeout: 5000 });
      } catch {
        // Ignore reload synchronization failures and continue polling.
      }

      await wait(250);
      continue;
    }

    await wait(250);
  }

  return { finalDebug, playbackStarted, recoveryObserved };
}
