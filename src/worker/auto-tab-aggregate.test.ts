import type { AutoFrameRuntimeState } from "../shared/types";
import { aggregateAutoFrameStates } from "./auto-tab-aggregate";

function makeFrameState(overrides: Partial<AutoFrameRuntimeState> = {}): AutoFrameRuntimeState {
  return {
    tabId: 7,
    frameId: overrides.frameId ?? 0,
    documentId: overrides.documentId ?? `doc-${overrides.frameId ?? 0}`,
    isTopFrame: overrides.isTopFrame ?? true,
    frameUrl: overrides.frameUrl ?? "https://example.com",
    title: overrides.title ?? "Example",
    url: overrides.url ?? "https://example.com",
    domain: overrides.domain ?? "example.com",
    favIconUrl: overrides.favIconUrl,
    autoAttachState: overrides.autoAttachState ?? "observing",
    autoAttachReason: overrides.autoAttachReason ?? "no_media",
    autoBoosterScope: overrides.autoBoosterScope ?? "global",
    autoActiveStrategy: overrides.autoActiveStrategy ?? "none",
    gainPercent: overrides.gainPercent ?? 220,
    ready: overrides.ready ?? true,
    streamState: overrides.streamState ?? "inactive",
    engineStatus: overrides.engineStatus ?? "ready",
    level: overrides.level ?? 0,
    warning: overrides.warning ?? "none",
    protectorActionDb: overrides.protectorActionDb ?? 0,
    clipEvents: overrides.clipEvents ?? 0,
    clipPeak: overrides.clipPeak ?? 0,
    protectionBypassed: overrides.protectionBypassed ?? false,
    outputPeak: overrides.outputPeak ?? 0,
    lastError: overrides.lastError,
    bridgeContextCount: overrides.bridgeContextCount,
    bridgeAttachedNodeCount: overrides.bridgeAttachedNodeCount,
    toastVisible: overrides.toastVisible ?? false
  };
}

describe("aggregateAutoFrameStates", () => {
  it("combines media-element and bridge frames into a hybrid attached tab state", () => {
    const aggregation = aggregateAutoFrameStates(
      7,
      [
        makeFrameState({
          frameId: 0,
          isTopFrame: true,
          autoAttachState: "attached",
          autoAttachReason: undefined,
          autoActiveStrategy: "media_element",
          streamState: "active",
          level: 0.42,
          warning: "high",
          protectorActionDb: 4.1,
          clipEvents: 2,
          clipPeak: 0.6,
          outputPeak: 0.31
        }),
        makeFrameState({
          frameId: 1,
          isTopFrame: false,
          autoAttachState: "attached",
          autoAttachReason: undefined,
          autoActiveStrategy: "web_audio_bridge",
          streamState: "active",
          level: 0.73,
          warning: "danger",
          protectorActionDb: 7.4,
          clipEvents: 5,
          clipPeak: 0.91,
          protectionBypassed: true,
          outputPeak: 0.58
        })
      ],
      () => 123456
    );

    expect(aggregation?.tabState).toMatchObject({
      tabId: 7,
      autoAttachState: "attached",
      autoActiveStrategy: "hybrid"
    });
    expect(aggregation?.session).toMatchObject({
      streamState: "active",
      autoActiveStrategy: "hybrid",
      level: 0.73,
      warning: "danger",
      protectorActionDb: 7.4,
      clipEvents: 7,
      clipPeak: 0.91,
      protectionBypassed: true,
      outputPeak: 0.58,
      updatedAt: 123456
    });
    expect(aggregation?.debug).toEqual({
      frameCount: 2,
      readyFrameCount: 2,
      attachedFrameCount: 2,
      toastVisible: false
    });
  });

  it("keeps attached auto lane when a frame is attached even if level is currently 0", () => {
    const aggregation = aggregateAutoFrameStates(
      7,
      [
        makeFrameState({
          frameId: 0,
          isTopFrame: true,
          autoAttachState: "attached",
          autoAttachReason: undefined,
          autoActiveStrategy: "media_element",
          streamState: "active",
          level: 0,
          warning: "none",
          protectorActionDb: 0,
          clipEvents: 0,
          clipPeak: 0,
          outputPeak: 0
        }),
        makeFrameState({
          frameId: 1,
          isTopFrame: false,
          autoAttachState: "observing",
          autoAttachReason: "no_media",
          streamState: "inactive"
        })
      ],
      () => 123456
    );

    expect(aggregation?.tabState).toMatchObject({
      tabId: 7,
      autoAttachState: "attached",
      autoAttachReason: undefined
    });
    expect(aggregation?.session).toMatchObject({
      streamState: "active",
      autoActiveStrategy: "media_element",
      level: 0,
      warning: "none",
      protectionBypassed: false,
      outputPeak: 0
    });
  });

  it("prefers awaiting_user_gesture over failed when nothing is attached", () => {
    const aggregation = aggregateAutoFrameStates(
      7,
      [
        makeFrameState({
          frameId: 0,
          autoAttachState: "awaiting_user_gesture",
          autoAttachReason: "autoplay_blocked",
          lastError: { key: "errorAutoAwaitingGesture" }
        }),
        makeFrameState({
          frameId: 1,
          isTopFrame: false,
          autoAttachState: "failed",
          autoAttachReason: "attach_failed",
          lastError: { key: "errorAutoAttachFailed" }
        })
      ],
      () => 1
    );

    expect(aggregation?.tabState).toMatchObject({
      autoAttachState: "awaiting_user_gesture",
      autoAttachReason: "autoplay_blocked",
      lastError: { key: "errorAutoAwaitingGesture" }
    });
    expect(aggregation?.session).toBeNull();
  });

  it("reports unsupported only when every frame is unsupported", () => {
    const aggregation = aggregateAutoFrameStates(
      7,
      [
        makeFrameState({
          frameId: 0,
          autoAttachState: "unsupported",
          autoAttachReason: "site_not_hookable",
          lastError: { key: "errorTabNotCapturable" }
        }),
        makeFrameState({
          frameId: 1,
          isTopFrame: false,
          autoAttachState: "unsupported",
          autoAttachReason: "permission_missing",
          lastError: { key: "errorAutoPermissionMissing" }
        })
      ],
      () => 1
    );

    expect(aggregation?.tabState).toMatchObject({
      autoAttachState: "unsupported",
      autoAttachReason: "site_not_hookable",
      lastError: { key: "errorTabNotCapturable" }
    });
  });

  it("keeps observing when at least one frame is still scanning", () => {
    const aggregation = aggregateAutoFrameStates(
      7,
      [
        makeFrameState({
          frameId: 0,
          autoAttachState: "observing",
          autoAttachReason: "no_media"
        }),
        makeFrameState({
          frameId: 1,
          isTopFrame: false,
          autoAttachState: "failed",
          autoAttachReason: "attach_failed",
          lastError: { key: "errorAutoAttachFailed" }
        })
      ],
      () => 1
    );

    expect(aggregation?.tabState).toMatchObject({
      autoAttachState: "observing",
      autoAttachReason: "no_media"
    });
  });
});
