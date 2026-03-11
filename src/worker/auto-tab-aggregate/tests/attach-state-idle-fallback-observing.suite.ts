import { aggregateAutoFrameStates } from "../../auto-tab-aggregate";
import { makeAutoFrameRuntimeState } from "./make-auto-frame-runtime-state";

it("falls back to observing for idle-only frame sets", () => {
  const aggregation = aggregateAutoFrameStates(
    23,
    [
      makeAutoFrameRuntimeState({ autoAttachState: "idle", autoAttachReason: undefined, lastError: undefined }),
      makeAutoFrameRuntimeState({ frameId: 1, isTopFrame: false, autoAttachState: "idle", autoAttachReason: undefined, lastError: undefined })
    ],
    () => 1
  );

  expect(aggregation?.tabState).toMatchObject({ autoAttachState: "observing", autoAttachReason: "no_media", lastError: undefined });
});
