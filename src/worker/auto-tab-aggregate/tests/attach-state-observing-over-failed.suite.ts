import { aggregateAutoFrameStates } from "../../auto-tab-aggregate";
import { makeAutoFrameRuntimeState } from "./make-auto-frame-runtime-state";

it("keeps observing when at least one frame is still scanning", () => {
  const aggregation = aggregateAutoFrameStates(
    7,
    [
      makeAutoFrameRuntimeState({ autoAttachState: "observing", autoAttachReason: "no_media" }),
      makeAutoFrameRuntimeState({ frameId: 1, isTopFrame: false, autoAttachState: "failed", autoAttachReason: "attach_failed", lastError: { key: "errorAutoAttachFailed" } })
    ],
    () => 1
  );

  expect(aggregation?.tabState).toMatchObject({ autoAttachState: "observing", autoAttachReason: "no_media" });
});
