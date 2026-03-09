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
    autoAttachReason:
      Object.prototype.hasOwnProperty.call(overrides, "autoAttachReason") ? overrides.autoAttachReason : "no_media",
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

  it("returns null for empty tabs and falls back to the first attached frame when no top frame exists", () => {
    expect(aggregateAutoFrameStates(7, [], () => 1)).toBeNull();

    const aggregation = aggregateAutoFrameStates(
      7,
      [
        makeFrameState({
          frameId: 1,
          isTopFrame: false,
          title: "Attached child",
          url: "https://child.example/attached",
          domain: "child.example",
          autoAttachState: "attached",
          autoAttachReason: undefined,
          autoActiveStrategy: "media_element",
          streamState: "active",
          gainPercent: undefined
        }),
        makeFrameState({
          frameId: 2,
          isTopFrame: false,
          title: "Observer",
          url: "https://child.example/observe",
          domain: "child.example",
          autoAttachState: "observing",
          autoAttachReason: "no_media"
        })
      ],
      () => 77
    );

    expect(aggregation).toMatchObject({
      tabState: {
        title: "Attached child",
        url: "https://child.example/attached",
        domain: "child.example",
        gainPercent: 220,
        autoActiveStrategy: "media_element",
        autoAttachState: "attached",
        autoAttachReason: undefined
      },
      session: {
        updatedAt: 77,
        engineStatus: "ready",
        streamState: "active",
        gainPercent: 220
      }
    });
  });

  it("prefers the bridge strategy when only bridge frames are attached and preserves debug counts", () => {
    const aggregation = aggregateAutoFrameStates(
      9,
      [
        makeFrameState({
          frameId: 0,
          isTopFrame: true,
          ready: false,
          toastVisible: true,
          autoAttachState: "attached",
          autoAttachReason: undefined,
          autoActiveStrategy: "web_audio_bridge",
          streamState: "active",
          level: 0.51,
          warning: "high",
          protectorActionDb: 3.33,
          clipEvents: 4,
          clipPeak: 0.66,
          outputPeak: 0.48
        }),
        makeFrameState({
          frameId: 1,
          isTopFrame: false,
          autoAttachState: "observing",
          autoAttachReason: "no_media",
          toastVisible: false
        })
      ],
      () => 99
    );

    expect(aggregation).toMatchObject({
      tabState: {
        autoActiveStrategy: "web_audio_bridge",
        autoAttachState: "attached",
        autoAttachReason: undefined
      },
      session: {
        autoActiveStrategy: "web_audio_bridge",
        warning: "high",
        protectorActionDb: 3.33,
        clipEvents: 4,
        clipPeak: 0.66,
        outputPeak: 0.48
      },
      debug: {
        frameCount: 2,
        readyFrameCount: 1,
        attachedFrameCount: 1,
        toastVisible: true
      }
    });
  });

  it("derives failed reasons and last errors with exact attach-state precedence", () => {
    const aggregation = aggregateAutoFrameStates(
      10,
      [
        makeFrameState({
          frameId: 0,
          autoAttachState: "failed",
          autoAttachReason: "permission_missing",
          lastError: { key: "errorAutoPermissionMissing" },
          autoActiveStrategy: "none"
        }),
        makeFrameState({
          frameId: 1,
          isTopFrame: false,
          autoAttachState: "failed",
          autoAttachReason: "attach_failed",
          lastError: { key: "errorAutoAttachFailed" }
        })
      ],
      () => 100
    );

    expect(aggregation).toMatchObject({
      tabState: {
        autoAttachState: "failed",
        autoAttachReason: "attach_failed",
        lastError: { key: "errorAutoPermissionMissing" }
      },
      session: null
    });
  });

  it("prefers unsupported and observing errors from matching frame states before generic fallbacks", () => {
    const unsupportedAggregation = aggregateAutoFrameStates(
      11,
      [
        makeFrameState({
          frameId: 0,
          autoAttachState: "unsupported",
          autoAttachReason: "permission_missing",
          lastError: { key: "errorAutoPermissionMissing" }
        }),
        makeFrameState({
          frameId: 1,
          isTopFrame: false,
          autoAttachState: "unsupported",
          autoAttachReason: undefined,
          lastError: { key: "errorTabNotCapturable" }
        })
      ],
      () => 1
    );
    const observingAggregation = aggregateAutoFrameStates(
      12,
      [
        makeFrameState({
          frameId: 0,
          autoAttachState: "observing",
          autoAttachReason: "no_media",
          lastError: { key: "errorAutoAttachFailed" }
        }),
        makeFrameState({
          frameId: 1,
          isTopFrame: false,
          autoAttachState: "failed",
          autoAttachReason: "attach_failed",
          lastError: { key: "errorAutoPermissionMissing" }
        })
      ],
      () => 1
    );

    expect(unsupportedAggregation?.tabState).toMatchObject({
      autoAttachState: "unsupported",
      autoAttachReason: "permission_missing",
      lastError: { key: "errorAutoPermissionMissing" }
    });
    expect(observingAggregation?.tabState).toMatchObject({
      autoAttachState: "observing",
      autoAttachReason: "no_media",
      lastError: { key: "errorAutoAttachFailed" }
    });
  });

  it("treats a single hybrid attachment as hybrid and ignores louder inactive frames in attached telemetry", () => {
    const aggregation = aggregateAutoFrameStates(
      13,
      [
        makeFrameState({
          frameId: 0,
          isTopFrame: true,
          autoAttachState: "attached",
          autoAttachReason: undefined,
          autoActiveStrategy: "hybrid",
          streamState: "active",
          level: 0.24,
          warning: "high",
          protectorActionDb: 1.11,
          clipEvents: 1,
          clipPeak: 0.22,
          outputPeak: 0.33
        }),
        makeFrameState({
          frameId: 1,
          isTopFrame: false,
          autoAttachState: "failed",
          autoAttachReason: "attach_failed",
          autoActiveStrategy: "web_audio_bridge",
          streamState: "inactive",
          level: 0.99,
          warning: "danger",
          protectorActionDb: 9.99,
          clipEvents: 99,
          clipPeak: 0.99,
          outputPeak: 0.99,
          protectionBypassed: true,
          lastError: { key: "errorAutoAttachFailed" }
        })
      ],
      () => 333
    );

    expect(aggregation).toMatchObject({
      tabState: {
        autoAttachState: "attached",
        autoAttachReason: undefined,
        autoActiveStrategy: "hybrid"
      },
      session: {
        autoActiveStrategy: "hybrid",
        streamState: "active",
        engineStatus: "ready",
        level: 0.24,
        warning: "high",
        protectorActionDb: 1.11,
        clipEvents: 1,
        clipPeak: 0.22,
        outputPeak: 0.33,
        protectionBypassed: false,
        updatedAt: 333
      }
    });
  });

  it("falls back to the first frame when there is neither a top frame nor an attached frame", () => {
    const aggregation = aggregateAutoFrameStates(
      14,
      [
        makeFrameState({
          frameId: 3,
          isTopFrame: false,
          title: "First observer",
          url: "https://first.example/watch",
          domain: "first.example",
          autoAttachState: "observing",
          autoAttachReason: "no_media",
          gainPercent: 321
        }),
        makeFrameState({
          frameId: 4,
          isTopFrame: false,
          title: "Second observer",
          url: "https://second.example/watch",
          domain: "second.example",
          autoAttachState: "failed",
          autoAttachReason: "attach_failed"
        })
      ],
      () => 444
    );

    expect(aggregation).toMatchObject({
      tabState: {
        title: "First observer",
        url: "https://first.example/watch",
        domain: "first.example",
        gainPercent: 321,
        autoAttachState: "observing",
        autoAttachReason: "no_media"
      },
      session: null,
      debug: {
        frameCount: 2,
        readyFrameCount: 2,
        attachedFrameCount: 0,
        toastVisible: false
      }
    });
  });

  it("prefers failed over unsupported when not every frame is unsupported", () => {
    const aggregation = aggregateAutoFrameStates(
      15,
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
          autoAttachState: "failed",
          autoAttachReason: "permission_missing",
          lastError: { key: "errorAutoPermissionMissing" }
        })
      ],
      () => 555
    );

    expect(aggregation?.tabState).toMatchObject({
      autoAttachState: "failed",
      autoAttachReason: "permission_missing",
      lastError: { key: "errorAutoPermissionMissing" }
    });
  });

  it("keeps attached sessions free of lastError even when frames still carry stale failures", () => {
    const aggregation = aggregateAutoFrameStates(
      16,
      [
        makeFrameState({
          frameId: 0,
          autoAttachState: "attached",
          autoAttachReason: undefined,
          autoActiveStrategy: "media_element",
          streamState: "active",
          lastError: { key: "errorAutoAttachFailed" }
        }),
        makeFrameState({
          frameId: 1,
          isTopFrame: false,
          autoAttachState: "failed",
          autoAttachReason: "attach_failed",
          lastError: { key: "errorAutoPermissionMissing" }
        })
      ],
      () => 666
    );

    expect(aggregation?.tabState.lastError).toBeUndefined();
    expect(aggregation?.session?.lastError).toBeUndefined();
  });

  it("falls back to a generic last error when the matching unsupported or observing frame has none", () => {
    const unsupportedAggregation = aggregateAutoFrameStates(
      17,
      [
        makeFrameState({
          frameId: 0,
          autoAttachState: "unsupported",
          autoAttachReason: "site_not_hookable",
          lastError: undefined
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
    const observingAggregation = aggregateAutoFrameStates(
      18,
      [
        makeFrameState({
          frameId: 0,
          autoAttachState: "observing",
          autoAttachReason: "no_media",
          lastError: undefined
        }),
        makeFrameState({
          frameId: 1,
          isTopFrame: false,
          autoAttachState: "failed",
          autoAttachReason: "attach_failed",
          lastError: { key: "errorAutoPermissionMissing" }
        })
      ],
      () => 1
    );

    expect(unsupportedAggregation?.tabState).toMatchObject({
      autoAttachState: "failed",
      autoAttachReason: "attach_failed",
      lastError: { key: "errorAutoAttachFailed" }
    });
    expect(observingAggregation?.tabState).toMatchObject({
      autoAttachState: "observing",
      autoAttachReason: "no_media",
      lastError: { key: "errorAutoPermissionMissing" }
    });
  });

  it("falls back to generic last errors when matching awaiting or failed frames have no specific error payload", () => {
    const awaitingAggregation = aggregateAutoFrameStates(
      19,
      [
        makeFrameState({
          frameId: 0,
          autoAttachState: "awaiting_user_gesture",
          autoAttachReason: "autoplay_blocked",
          lastError: undefined
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
    const failedAggregation = aggregateAutoFrameStates(
      20,
      [
        makeFrameState({
          frameId: 0,
          autoAttachState: "failed",
          autoAttachReason: "attach_failed",
          lastError: undefined
        }),
        makeFrameState({
          frameId: 1,
          isTopFrame: false,
          autoAttachState: "failed",
          autoAttachReason: "permission_missing",
          lastError: { key: "errorAutoPermissionMissing" }
        })
      ],
      () => 1
    );

    expect(awaitingAggregation?.tabState).toMatchObject({
      autoAttachState: "awaiting_user_gesture",
      autoAttachReason: "autoplay_blocked",
      lastError: { key: "errorAutoAttachFailed" }
    });
    expect(failedAggregation?.tabState).toMatchObject({
      autoAttachState: "failed",
      autoAttachReason: "attach_failed",
      lastError: { key: "errorAutoPermissionMissing" }
    });
  });

  it("prefers the site-not-hookable reason even when it arrives after another unsupported reason", () => {
    const aggregation = aggregateAutoFrameStates(
      21,
      [
        makeFrameState({
          frameId: 0,
          autoAttachState: "unsupported",
          autoAttachReason: "permission_missing",
          lastError: { key: "errorAutoPermissionMissing" }
        }),
        makeFrameState({
          frameId: 1,
          isTopFrame: false,
          autoAttachState: "unsupported",
          autoAttachReason: "site_not_hookable",
          lastError: { key: "errorTabNotCapturable" }
        })
      ],
      () => 1
    );

    expect(aggregation?.tabState).toMatchObject({
      autoAttachState: "unsupported",
      autoAttachReason: "site_not_hookable",
      lastError: { key: "errorAutoPermissionMissing" }
    });
  });

  it("reports failed when no frame is attached, awaiting, observing, or uniformly unsupported", () => {
    const aggregation = aggregateAutoFrameStates(
      22,
      [
        makeFrameState({
          frameId: 0,
          autoAttachState: "failed",
          autoAttachReason: "permission_missing",
          lastError: { key: "errorAutoPermissionMissing" }
        }),
        makeFrameState({
          frameId: 1,
          isTopFrame: false,
          autoAttachState: "unsupported",
          autoAttachReason: "site_not_hookable",
          lastError: { key: "errorTabNotCapturable" }
        })
      ],
      () => 1
    );

    expect(aggregation?.tabState).toMatchObject({
      autoAttachState: "failed",
      autoAttachReason: "permission_missing",
      lastError: { key: "errorAutoPermissionMissing" }
    });
    expect(aggregation?.session).toBeNull();
  });

  it("falls back to observing when frames are neither attached nor explicitly failed", () => {
    const aggregation = aggregateAutoFrameStates(
      23,
      [
        makeFrameState({
          frameId: 0,
          autoAttachState: "idle",
          autoAttachReason: undefined,
          lastError: undefined
        }),
        makeFrameState({
          frameId: 1,
          isTopFrame: false,
          autoAttachState: "idle",
          autoAttachReason: undefined,
          lastError: undefined
        })
      ],
      () => 1
    );

    expect(aggregation?.tabState).toMatchObject({
      autoAttachState: "observing",
      autoAttachReason: "no_media",
      lastError: undefined
    });
  });

  it("falls back to the first available unsupported reason when site-not-hookable is absent", () => {
    const aggregation = aggregateAutoFrameStates(
      24,
      [
        makeFrameState({
          frameId: 0,
          autoAttachState: "unsupported",
          autoAttachReason: undefined,
          lastError: undefined
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
      autoAttachReason: "permission_missing",
      lastError: { key: "errorAutoPermissionMissing" }
    });
  });

  it("falls back to the first available failed reason when no attach-failed or permission-missing reason exists", () => {
    const aggregation = aggregateAutoFrameStates(
      25,
      [
        makeFrameState({
          frameId: 0,
          autoAttachState: "failed",
          autoAttachReason: undefined,
          lastError: undefined
        }),
        makeFrameState({
          frameId: 1,
          isTopFrame: false,
          autoAttachState: "failed",
          autoAttachReason: "autoplay_blocked",
          lastError: { key: "errorAutoAwaitingGesture" }
        })
      ],
      () => 1
    );

    expect(aggregation?.tabState).toMatchObject({
      autoAttachState: "failed",
      autoAttachReason: "autoplay_blocked",
      lastError: { key: "errorAutoAwaitingGesture" }
    });
  });

  it("prefers a matching awaiting-user-gesture error over earlier generic errors", () => {
    const aggregation = aggregateAutoFrameStates(
      26,
      [
        makeFrameState({
          frameId: 0,
          autoAttachState: "failed",
          autoAttachReason: "attach_failed",
          lastError: { key: "errorAutoAttachFailed" }
        }),
        makeFrameState({
          frameId: 1,
          isTopFrame: false,
          autoAttachState: "awaiting_user_gesture",
          autoAttachReason: "autoplay_blocked",
          lastError: undefined
        }),
        makeFrameState({
          frameId: 2,
          isTopFrame: false,
          autoAttachState: "awaiting_user_gesture",
          autoAttachReason: "autoplay_blocked",
          lastError: { key: "errorAutoAwaitingGesture" }
        })
      ],
      () => 1
    );

    expect(aggregation?.tabState).toMatchObject({
      autoAttachState: "awaiting_user_gesture",
      autoAttachReason: "autoplay_blocked",
      lastError: { key: "errorAutoAwaitingGesture" }
    });
  });

  it("keeps the first unsupported error payload when the first matching unsupported frame already carries one", () => {
    const aggregation = aggregateAutoFrameStates(
      27,
      [
        makeFrameState({
          frameId: 0,
          autoAttachState: "unsupported",
          autoAttachReason: "permission_missing",
          lastError: { key: "errorAutoAttachFailed" }
        }),
        makeFrameState({
          frameId: 1,
          isTopFrame: false,
          autoAttachState: "unsupported",
          autoAttachReason: "permission_missing",
          lastError: undefined
        }),
        makeFrameState({
          frameId: 2,
          isTopFrame: false,
          autoAttachState: "unsupported",
          autoAttachReason: "permission_missing",
          lastError: { key: "errorTabNotCapturable" }
        })
      ],
      () => 1
    );

    expect(aggregation?.tabState).toMatchObject({
      autoAttachState: "unsupported",
      autoAttachReason: "permission_missing",
      lastError: { key: "errorAutoAttachFailed" }
    });
  });

  it("prefers a matching observing error over earlier generic errors", () => {
    const aggregation = aggregateAutoFrameStates(
      28,
      [
        makeFrameState({
          frameId: 0,
          autoAttachState: "failed",
          autoAttachReason: "attach_failed",
          lastError: { key: "errorAutoAttachFailed" }
        }),
        makeFrameState({
          frameId: 1,
          isTopFrame: false,
          autoAttachState: "observing",
          autoAttachReason: "no_media",
          lastError: undefined
        }),
        makeFrameState({
          frameId: 2,
          isTopFrame: false,
          autoAttachState: "observing",
          autoAttachReason: "no_media",
          lastError: { key: "errorAutoPermissionMissing" }
        })
      ],
      () => 1
    );

    expect(aggregation?.tabState).toMatchObject({
      autoAttachState: "observing",
      autoAttachReason: "no_media",
      lastError: { key: "errorAutoPermissionMissing" }
    });
  });

  it("prefers a matching failed error over earlier generic errors when the failed frame set has a later error payload", () => {
    const aggregation = aggregateAutoFrameStates(
      29,
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
          autoAttachState: "failed",
          autoAttachReason: "attach_failed",
          lastError: undefined
        }),
        makeFrameState({
          frameId: 2,
          isTopFrame: false,
          autoAttachState: "failed",
          autoAttachReason: "attach_failed",
          lastError: { key: "errorAutoAttachFailed" }
        })
      ],
      () => 1
    );

    expect(aggregation?.tabState).toMatchObject({
      autoAttachState: "failed",
      autoAttachReason: "attach_failed",
      lastError: { key: "errorAutoAttachFailed" }
    });
  });
});
