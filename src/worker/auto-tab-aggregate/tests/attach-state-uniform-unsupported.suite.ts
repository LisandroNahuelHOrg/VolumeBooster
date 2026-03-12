import { aggregateAutoFrameStates } from "../../auto-tab-aggregate";
import { makeAutoFrameRuntimeState } from "./make-auto-frame-runtime-state";

it("reports unsupported only when every frame is unsupported", () => {
  const aggregation = aggregateAutoFrameStates(
    7,
    [
      makeAutoFrameRuntimeState({ autoAttachState: "unsupported", autoAttachReason: "site_not_hookable", lastError: { key: "errorTabNotCapturable" } }),
      makeAutoFrameRuntimeState({ frameId: 1, isTopFrame: false, autoAttachState: "unsupported", autoAttachReason: "permission_missing", lastError: { key: "errorAutoPermissionMissing" } })
    ],
    () => 1
  );

  expect(aggregation?.tabState).toMatchObject({
    autoAttachState: "unsupported",
    autoAttachReason: "site_not_hookable",
    lastError: { key: "errorTabNotCapturable" }
  });
});
