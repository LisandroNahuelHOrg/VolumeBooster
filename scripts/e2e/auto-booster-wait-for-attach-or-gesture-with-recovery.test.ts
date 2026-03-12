import { expect, test } from "vitest";
import { waitForAttachOrGestureWithRecovery } from "./auto-booster/waiters/wait-for-attach-or-gesture-with-recovery.mjs";

test("retries playback once after recoveryPending and returns the attached debug state", async () => {
  let debugCallCount = 0;
  let playbackCallCount = 0;
  const automationPage = {
    evaluate: async () => {
      debugCallCount += 1;

      if (debugCallCount === 1) {
        return { attachState: "observing" };
      }

      if (debugCallCount === 2) {
        return { attachState: "observing", recoveryPending: true };
      }

      return { attachState: "attached", recoveryPending: false };
    }
  };
  const page = {
    waitForLoadState: async () => undefined
  };
  const outcome = await waitForAttachOrGestureWithRecovery({
    allowAwaitingGesture: false,
    automationPage,
    page,
    startPlayback: async () => {
      playbackCallCount += 1;
      return playbackCallCount === 1;
    },
    tabId: 7,
    timeoutMs: 1000
  });

  expect(playbackCallCount).toBe(2);
  expect(outcome).toEqual({
    finalDebug: { attachState: "attached", recoveryPending: false },
    playbackStarted: true,
    recoveryObserved: true
  });
});
