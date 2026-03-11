import { syncFromOffscreen } from "./manual/sync-from-offscreen";
import { normalizeManualSession } from "./manual/normalize-manual-session";
import { makeSession, createTestRuntime } from "./test-harness";

describe("worker/orchestrator manual lane", () => {
  it("keeps current manual sessions when offscreen snapshot is empty and there is local state", async () => {
    const { runtime, offscreenClient } = createTestRuntime();
    runtime.manualSessions.set(400, makeSession(400, "youtube.com", 220));
    offscreenClient.getSnapshot.mockResolvedValue([]);

    await syncFromOffscreen(runtime);

    expect(runtime.manualSessions.has(400)).toBe(true);
  });

  it("normalizes manual sessions when replacing from offscreen", () => {
    expect(
      normalizeManualSession(
        makeSession(7, "youtube.com", 220, {
          autoAttachReason: "attach_failed",
          autoAttachState: "failed"
        })
      )
    ).toMatchObject({
      engineLane: "manual_tab_capture",
      autoAttachState: "idle",
      autoAttachReason: undefined
    });
  });
});
