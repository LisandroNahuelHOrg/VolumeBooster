import { message } from "../../shared/messages";
import { buildCachedAutoDebugState } from "./state/build-cached-auto-debug-state";
import { getAutoScopeForTab } from "./state/get-auto-scope-for-tab";
import { rebuildEffectiveSessions } from "./state/rebuild-effective-sessions";
import { shouldAutoRemainEnabled } from "./state/should-auto-remain-enabled";
import { toErrorMessage } from "./state/to-error-message";
import { createTestRuntime, makeSession } from "./test-harness";

describe("worker/orchestrator state query", () => {
  it("gives manual sessions precedence over auto sessions when rebuilding the effective map", () => {
    const { runtime } = createTestRuntime();
    runtime.autoSessions.set(7, makeSession(7, "youtube.com", 220, { engineLane: "auto_media_element" }));
    runtime.manualSessions.set(7, makeSession(7, "youtube.com", 260));

    rebuildEffectiveSessions(runtime);

    expect(runtime.sessions.get(7)?.engineLane).toBe("manual_tab_capture");
    expect(runtime.sessions.get(7)?.gainPercent).toBe(260);
  });

  it("derives cached debug state and auto scope from runtime caches", () => {
    const { runtime } = createTestRuntime();
    runtime.autoSuppressedTabs.add(17);
    runtime.autoSessions.set(17, makeSession(17, "youtube.com", 220, { engineLane: "auto_media_element" }));
    runtime.autoTabStates.set(17, {
      tabId: 17,
      title: "YouTube",
      url: "https://youtube.com/watch?v=1",
      domain: "youtube.com",
      favIconUrl: "https://youtube.com/favicon.ico",
      autoAttachState: "attached",
      autoAttachReason: undefined,
      autoBoosterScope: "global",
      autoActiveStrategy: "media_element",
      gainPercent: 220
    });
    runtime.autoDebugStates.set(17, {
      frameCount: 3,
      readyFrameCount: 2,
      attachedFrameCount: 1,
      toastVisible: true
    });
    runtime.autoBoosterMode = "global";

    expect(getAutoScopeForTab(runtime, 17)).toBe("global");
    expect(shouldAutoRemainEnabled(runtime, 18)).toBe(true);
    expect(buildCachedAutoDebugState(runtime, 17)).toMatchObject({
      suspended: true,
      attachedElementCount: 1,
      frameCount: 3,
      toastVisible: true
    });
  });

  it("normalizes unknown errors into localized extension failures", () => {
    expect(toErrorMessage(message("errorTabNotCapturable"))).toEqual(message("errorTabNotCapturable"));
    expect(toErrorMessage(new Error("boom"))).toEqual(message("errorExtensionActionFailed"));
  });
});
