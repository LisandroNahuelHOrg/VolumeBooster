import { aggregateAutoFrameStates } from "../../auto-tab-aggregate";
import { makeAutoFrameRuntimeState } from "./make-auto-frame-runtime-state";

it("prefers matching awaiting-user-gesture errors and falls back to generic errors when needed", () => {
  const matched = aggregateAutoFrameStates(
    26,
    [
      makeAutoFrameRuntimeState({ autoAttachState: "failed", autoAttachReason: "attach_failed", lastError: { key: "errorAutoAttachFailed" } }),
      makeAutoFrameRuntimeState({ frameId: 1, isTopFrame: false, autoAttachState: "awaiting_user_gesture", autoAttachReason: "autoplay_blocked", lastError: undefined }),
      makeAutoFrameRuntimeState({ frameId: 2, isTopFrame: false, autoAttachState: "awaiting_user_gesture", autoAttachReason: "autoplay_blocked", lastError: { key: "errorAutoAwaitingGesture" } })
    ],
    () => 1
  );
  const fallback = aggregateAutoFrameStates(
    19,
    [
      makeAutoFrameRuntimeState({ autoAttachState: "awaiting_user_gesture", autoAttachReason: "autoplay_blocked", lastError: undefined }),
      makeAutoFrameRuntimeState({ frameId: 1, isTopFrame: false, autoAttachState: "failed", autoAttachReason: "attach_failed", lastError: { key: "errorAutoAttachFailed" } })
    ],
    () => 1
  );

  expect(matched?.tabState.lastError).toMatchObject({ key: "errorAutoAwaitingGesture" });
  expect(fallback?.tabState.lastError).toMatchObject({ key: "errorAutoAttachFailed" });
});
