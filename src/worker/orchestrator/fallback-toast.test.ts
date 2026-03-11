import { syncFallbackToastForTab } from "./fallback/sync-fallback-toast-for-tab";
import { createTestRuntime } from "./test-harness";

describe("worker/orchestrator fallback toast", () => {
  it("shows the global fallback toast only for failed top-frame global tabs", async () => {
    const { runtime, autoBoosterClient } = createTestRuntime();
    runtime.autoBoosterMode = "global";
    runtime.autoTabStates.set(7, {
      tabId: 7,
      title: "YouTube",
      url: "https://youtube.com/watch?v=1",
      domain: "youtube.com",
      favIconUrl: "https://youtube.com/favicon.ico",
      autoAttachState: "failed",
      autoAttachReason: "attach_failed",
      autoBoosterScope: "global",
      autoActiveStrategy: "none",
      gainPercent: 220
    });
    runtime.autoFrameRegistry.upsertKnownFrame({
      tabId: 7,
      frameId: 0,
      documentId: "top-doc",
      isTopFrame: true,
      frameUrl: "https://youtube.com/watch?v=1",
      ready: true
    });

    await syncFallbackToastForTab(runtime, 7);

    expect(autoBoosterClient.sendMessageToFrame).toHaveBeenCalledWith(
      7,
      expect.objectContaining({ frameId: 0, documentId: "top-doc" }),
      expect.objectContaining({
        type: "AUTO_BOOSTER_SHOW_FALLBACK_TOAST"
      })
    );
  });
});
