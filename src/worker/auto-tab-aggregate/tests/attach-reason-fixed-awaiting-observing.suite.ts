import { aggregateAutoFrameStates } from "../../auto-tab-aggregate";
import { makeAutoFrameRuntimeState } from "./make-auto-frame-runtime-state";

it("derives fixed reasons for awaiting-user-gesture and observing states", () => {
  const awaiting = aggregateAutoFrameStates(8, [makeAutoFrameRuntimeState({ autoAttachState: "awaiting_user_gesture", autoAttachReason: undefined })], () => 1);
  const observing = aggregateAutoFrameStates(9, [makeAutoFrameRuntimeState({ autoAttachState: "observing", autoAttachReason: undefined })], () => 1);

  expect(awaiting?.tabState.autoAttachReason).toBe("autoplay_blocked");
  expect(observing?.tabState.autoAttachReason).toBe("no_media");
});
