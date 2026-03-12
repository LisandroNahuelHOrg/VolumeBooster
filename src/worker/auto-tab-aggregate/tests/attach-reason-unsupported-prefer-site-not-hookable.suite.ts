import { aggregateAutoFrameStates } from "../../auto-tab-aggregate";
import { makeAutoFrameRuntimeState } from "./make-auto-frame-runtime-state";

it("prefers site-not-hookable for unsupported tabs and otherwise the first available unsupported reason", () => {
  const preferredSiteReason = aggregateAutoFrameStates(
    21,
    [
      makeAutoFrameRuntimeState({ autoAttachState: "unsupported", autoAttachReason: "permission_missing", lastError: { key: "errorAutoPermissionMissing" } }),
      makeAutoFrameRuntimeState({ frameId: 1, isTopFrame: false, autoAttachState: "unsupported", autoAttachReason: "site_not_hookable", lastError: { key: "errorTabNotCapturable" } })
    ],
    () => 1
  );
  const firstAvailableReason = aggregateAutoFrameStates(
    24,
    [
      makeAutoFrameRuntimeState({ autoAttachState: "unsupported", autoAttachReason: undefined, lastError: undefined }),
      makeAutoFrameRuntimeState({ frameId: 1, isTopFrame: false, autoAttachState: "unsupported", autoAttachReason: "permission_missing", lastError: { key: "errorAutoPermissionMissing" } })
    ],
    () => 1
  );

  expect(preferredSiteReason?.tabState.autoAttachReason).toBe("site_not_hookable");
  expect(firstAvailableReason?.tabState.autoAttachReason).toBe("permission_missing");
});
