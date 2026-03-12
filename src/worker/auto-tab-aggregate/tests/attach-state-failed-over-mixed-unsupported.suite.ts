import { aggregateAutoFrameStates } from "../../auto-tab-aggregate";
import { makeAutoFrameRuntimeState } from "./make-auto-frame-runtime-state";

it("prefers failed over unsupported when unsupported is mixed with failures", () => {
  const aggregation = aggregateAutoFrameStates(
    15,
    [
      makeAutoFrameRuntimeState({ autoAttachState: "unsupported", autoAttachReason: "site_not_hookable", lastError: { key: "errorTabNotCapturable" } }),
      makeAutoFrameRuntimeState({ frameId: 1, isTopFrame: false, autoAttachState: "failed", autoAttachReason: "permission_missing", lastError: { key: "errorAutoPermissionMissing" } })
    ],
    () => 555
  );

  expect(aggregation?.tabState).toMatchObject({
    autoAttachState: "failed",
    autoAttachReason: "permission_missing",
    lastError: { key: "errorAutoPermissionMissing" }
  });
});
