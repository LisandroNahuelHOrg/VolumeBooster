import { aggregateAutoFrameStates } from "../../auto-tab-aggregate";
import { makeAutoFrameRuntimeState } from "./make-auto-frame-runtime-state";

it("keeps non-attached aggregations sessionless and retains stable debug defaults", () => {
  const aggregation = aggregateAutoFrameStates(
    34,
    [
      makeAutoFrameRuntimeState({ autoAttachState: "observing", autoAttachReason: "no_media", toastVisible: false }),
      makeAutoFrameRuntimeState({ frameId: 1, isTopFrame: false, autoAttachState: "failed", autoAttachReason: "attach_failed", lastError: { key: "errorAutoAttachFailed" } })
    ],
    () => 1
  );

  expect(aggregation).toMatchObject({
    session: null,
    debug: { frameCount: 2, readyFrameCount: 2, attachedFrameCount: 0, toastVisible: false }
  });
});
