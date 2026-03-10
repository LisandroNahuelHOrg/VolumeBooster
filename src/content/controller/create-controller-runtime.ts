import { createBridgeDefaultMetrics } from "../bridge-protocol";
import type { CurrentFrameContext } from "../frame-runtime";
import type { ControllerRuntimeFields } from "./runtime-state";

export function createControllerRuntime(
  frameContext: CurrentFrameContext,
  onHistoryCheck: () => void
): ControllerRuntimeFields {
  return {
    frameContext,
    trackedSessions: new Map(),
    processedElements: new WeakSet(),
    pendingMediaRetryControllers: new Map(),
    historyCheckTimer: window.setInterval(onHistoryCheck, 500),
    telemetryTimer: null,
    observer: null,
    gestureRetryAbortController: null,
    bridgeStatus: {
      enabled: false,
      suspended: false,
      scope: null,
      attachState: "idle",
      activeStrategy: "none",
      audioContextState: "none",
      autoplayPolicy: undefined,
      audioContextCount: 0,
      attachedNodeCount: 0,
      currentUrl: window.location.href
    },
    bridgeTelemetry: {
      activeStrategy: "none",
      level: 0,
      warning: "none",
      metrics: createBridgeDefaultMetrics(),
      audioContextCount: 0,
      attachedNodeCount: 0,
      lastTelemetryAt: 0
    },
    state: {
      tabId: null,
      scope: null,
      enabled: false,
      suspended: false,
      gainPercent: 100,
      advancedAudioSettings: null,
      attachState: "idle",
      activeStrategy: "none"
    },
    lastLocationHref: window.location.href,
    lastTelemetryAt: null,
    lastLevel: 0,
    lastAudioContextState: "none",
    lastAutoplayPolicy: undefined,
    lastTechnicalError: undefined,
    refreshInFlight: false,
    refreshQueued: false,
    bridgeListenersBound: false,
    lastAutoRetryAt: 0
  };
}
