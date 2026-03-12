import { aggregateAutoFrameStates } from "../../auto-tab-aggregate";
import { makeAutoFrameRuntimeState } from "./make-auto-frame-runtime-state";

it("falls back to generic unsupported and observing errors when matching frames have none", () => {
  const unsupported = aggregateAutoFrameStates(
    17,
    [
      makeAutoFrameRuntimeState({ autoAttachState: "unsupported", autoAttachReason: "site_not_hookable", lastError: undefined }),
      makeAutoFrameRuntimeState({ frameId: 1, isTopFrame: false, autoAttachState: "failed", autoAttachReason: "attach_failed", lastError: { key: "errorAutoAttachFailed" } })
    ],
    () => 1
  );
  const observing = aggregateAutoFrameStates(
    18,
    [
      makeAutoFrameRuntimeState({ autoAttachState: "observing", autoAttachReason: "no_media", lastError: undefined }),
      makeAutoFrameRuntimeState({ frameId: 1, isTopFrame: false, autoAttachState: "failed", autoAttachReason: "attach_failed", lastError: { key: "errorAutoPermissionMissing" } })
    ],
    () => 1
  );

  expect(unsupported?.tabState.lastError).toMatchObject({ key: "errorAutoAttachFailed" });
  expect(observing?.tabState.lastError).toMatchObject({ key: "errorAutoPermissionMissing" });
});
