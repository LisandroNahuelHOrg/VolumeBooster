import { aggregateAutoFrameStates } from "../../auto-tab-aggregate";
import { makeAutoFrameRuntimeState } from "./make-auto-frame-runtime-state";

it("falls back to the first available failed reason when prioritized failed reasons are absent", () => {
  const aggregation = aggregateAutoFrameStates(
    25,
    [
      makeAutoFrameRuntimeState({ autoAttachState: "failed", autoAttachReason: undefined, lastError: undefined }),
      makeAutoFrameRuntimeState({ frameId: 1, isTopFrame: false, autoAttachState: "failed", autoAttachReason: "autoplay_blocked", lastError: { key: "errorAutoAwaitingGesture" } })
    ],
    () => 1
  );

  expect(aggregation?.tabState).toMatchObject({ autoAttachState: "failed", autoAttachReason: "autoplay_blocked" });
});
