import { aggregateAutoFrameStates } from "../../auto-tab-aggregate";
import { makeAutoFrameRuntimeState } from "./make-auto-frame-runtime-state";

it("keeps attached sessions free of lastError even when frames carry stale failures", () => {
  const aggregation = aggregateAutoFrameStates(
    16,
    [
      makeAutoFrameRuntimeState({ autoAttachState: "attached", autoAttachReason: undefined, autoActiveStrategy: "media_element", streamState: "active", lastError: { key: "errorAutoAttachFailed" } }),
      makeAutoFrameRuntimeState({ frameId: 1, isTopFrame: false, autoAttachState: "failed", autoAttachReason: "attach_failed", lastError: { key: "errorAutoPermissionMissing" } })
    ],
    () => 666
  );

  expect(aggregation?.tabState.lastError).toBeUndefined();
  expect(aggregation?.session?.lastError).toBeUndefined();
});
