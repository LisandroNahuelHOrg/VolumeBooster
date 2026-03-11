import { aggregateAutoFrameStates } from "../../auto-tab-aggregate";
import { makeAutoFrameRuntimeState } from "./make-auto-frame-runtime-state";

it("prefers matching failed errors and falls back to generic failed errors when needed", () => {
  const matched = aggregateAutoFrameStates(
    29,
    [
      makeAutoFrameRuntimeState({ autoAttachState: "unsupported", autoAttachReason: "site_not_hookable", lastError: { key: "errorTabNotCapturable" } }),
      makeAutoFrameRuntimeState({ frameId: 1, isTopFrame: false, autoAttachState: "failed", autoAttachReason: "attach_failed", lastError: undefined }),
      makeAutoFrameRuntimeState({ frameId: 2, isTopFrame: false, autoAttachState: "failed", autoAttachReason: "attach_failed", lastError: { key: "errorAutoAttachFailed" } })
    ],
    () => 1
  );
  const fallback = aggregateAutoFrameStates(
    20,
    [
      makeAutoFrameRuntimeState({ autoAttachState: "failed", autoAttachReason: "attach_failed", lastError: undefined }),
      makeAutoFrameRuntimeState({ frameId: 1, isTopFrame: false, autoAttachState: "failed", autoAttachReason: "permission_missing", lastError: { key: "errorAutoPermissionMissing" } })
    ],
    () => 1
  );

  expect(matched?.tabState.lastError).toMatchObject({ key: "errorAutoAttachFailed" });
  expect(fallback?.tabState.lastError).toMatchObject({ key: "errorAutoPermissionMissing" });
});
