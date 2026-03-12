import { aggregateAutoFrameStates } from "../../auto-tab-aggregate";
import { makeAutoFrameRuntimeState } from "./make-auto-frame-runtime-state";

it("prioritizes failed reasons before generic fallbacks", () => {
  const attachFailed = aggregateAutoFrameStates(
    10,
    [
      makeAutoFrameRuntimeState({ autoAttachState: "failed", autoAttachReason: "permission_missing", lastError: { key: "errorAutoPermissionMissing" } }),
      makeAutoFrameRuntimeState({ frameId: 1, isTopFrame: false, autoAttachState: "failed", autoAttachReason: "attach_failed", lastError: { key: "errorAutoAttachFailed" } })
    ],
    () => 1
  );
  const permissionMissing = aggregateAutoFrameStates(
    22,
    [
      makeAutoFrameRuntimeState({ autoAttachState: "failed", autoAttachReason: "permission_missing", lastError: { key: "errorAutoPermissionMissing" } }),
      makeAutoFrameRuntimeState({ frameId: 1, isTopFrame: false, autoAttachState: "unsupported", autoAttachReason: "site_not_hookable", lastError: { key: "errorTabNotCapturable" } })
    ],
    () => 1
  );

  expect(attachFailed?.tabState.autoAttachReason).toBe("attach_failed");
  expect(permissionMissing?.tabState.autoAttachReason).toBe("permission_missing");
});
