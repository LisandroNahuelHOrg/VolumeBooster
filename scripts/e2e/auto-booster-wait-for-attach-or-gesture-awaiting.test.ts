import { expect, test } from "vitest";
import { waitForAttachOrGestureWithRecovery } from "./auto-booster/waiters/wait-for-attach-or-gesture-with-recovery.mjs";

test("returns early when awaiting_user_gesture is acceptable for the scenario", async () => {
  const automationPage = {
    evaluate: async () => ({ attachState: "awaiting_user_gesture", recoveryPending: false })
  };
  const page = {
    waitForLoadState: async () => undefined
  };
  const outcome = await waitForAttachOrGestureWithRecovery({
    allowAwaitingGesture: true,
    automationPage,
    page,
    startPlayback: async () => false,
    tabId: 12,
    timeoutMs: 1000
  });

  expect(outcome).toEqual({
    finalDebug: { attachState: "awaiting_user_gesture", recoveryPending: false },
    playbackStarted: false,
    recoveryObserved: false
  });
});
