import { aggregateAutoFrameStates } from "../../auto-tab-aggregate";
import { makeAutoFrameRuntimeState } from "./make-auto-frame-runtime-state";

it("prefers awaiting_user_gesture over failed when nothing is attached", () => {
  const aggregation = aggregateAutoFrameStates(
    7,
    [
      makeAutoFrameRuntimeState({ autoAttachState: "awaiting_user_gesture", autoAttachReason: "autoplay_blocked", lastError: { key: "errorAutoAwaitingGesture" } }),
      makeAutoFrameRuntimeState({ frameId: 1, isTopFrame: false, autoAttachState: "failed", autoAttachReason: "attach_failed", lastError: { key: "errorAutoAttachFailed" } })
    ],
    () => 1
  );

  expect(aggregation).toMatchObject({
    tabState: { autoAttachState: "awaiting_user_gesture", autoAttachReason: "autoplay_blocked", lastError: { key: "errorAutoAwaitingGesture" } },
    session: null
  });
});
