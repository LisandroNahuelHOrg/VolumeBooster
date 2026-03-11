import { aggregateAutoFrameStates } from "../../auto-tab-aggregate";
import { makeAutoFrameRuntimeState } from "./make-auto-frame-runtime-state";

it("prefers matching unsupported and observing errors before generic fallbacks", () => {
  const unsupported = aggregateAutoFrameStates(
    11,
    [
      makeAutoFrameRuntimeState({ autoAttachState: "unsupported", autoAttachReason: "permission_missing", lastError: { key: "errorAutoPermissionMissing" } }),
      makeAutoFrameRuntimeState({ frameId: 1, isTopFrame: false, autoAttachState: "unsupported", autoAttachReason: undefined, lastError: { key: "errorTabNotCapturable" } })
    ],
    () => 1
  );
  const observing = aggregateAutoFrameStates(
    28,
    [
      makeAutoFrameRuntimeState({ autoAttachState: "failed", autoAttachReason: "attach_failed", lastError: { key: "errorAutoAttachFailed" } }),
      makeAutoFrameRuntimeState({ frameId: 1, isTopFrame: false, autoAttachState: "observing", autoAttachReason: "no_media", lastError: undefined }),
      makeAutoFrameRuntimeState({ frameId: 2, isTopFrame: false, autoAttachState: "observing", autoAttachReason: "no_media", lastError: { key: "errorAutoPermissionMissing" } })
    ],
    () => 1
  );

  expect(unsupported?.tabState.lastError).toMatchObject({ key: "errorAutoPermissionMissing" });
  expect(observing?.tabState.lastError).toMatchObject({ key: "errorAutoPermissionMissing" });
});
