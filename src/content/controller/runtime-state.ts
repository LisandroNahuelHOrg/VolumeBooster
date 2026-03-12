import type {
  AdvancedAudioSettings,
  AutoActiveStrategy,
  AutoAttachReason,
  AutoAttachState,
  AutoBoosterConfigPayload,
  AutoBoosterDebugState,
  AutoBoosterScope,
  CaptureSessionState
} from "../../shared/types";
import type {
  BridgeCommandPayload,
  BridgeStatusPayload,
  BridgeTelemetryPayload
} from "../bridge-protocol";
import type { CurrentFrameContext } from "../frame-runtime";
import type {
  MediaElementSessionHandle,
  MediaElementTelemetry
} from "../media-element-session";

export interface ControllerState {
  tabId: number | null;
  scope: AutoBoosterScope | null;
  enabled: boolean;
  suspended: boolean;
  gainPercent: number;
  advancedAudioSettings: AdvancedAudioSettings | null;
  attachState: AutoAttachState;
  attachReason?: AutoAttachReason;
  lastError?: CaptureSessionState["lastError"];
  activeStrategy: AutoActiveStrategy;
}

export type TrackedSession = {
  session: MediaElementSessionHandle;
  lastTelemetry: MediaElementTelemetry;
};

export interface ControllerRuntimeFields {
  frameContext: CurrentFrameContext;
  trackedSessions: Map<HTMLMediaElement, TrackedSession>;
  processedElements: WeakSet<HTMLMediaElement>;
  pendingMediaRetryControllers: Map<HTMLMediaElement, AbortController>;
  historyCheckTimer: number;
  telemetryTimer: number | null;
  observer: MutationObserver | null;
  gestureRetryAbortController: AbortController | null;
  bridgeStatus: BridgeStatusPayload;
  bridgeTelemetry: BridgeTelemetryPayload;
  state: ControllerState;
  lastLocationHref: string;
  lastTelemetryAt: number | null;
  lastLevel: number;
  lastAudioContextState: AudioContextState | "none";
  lastAutoplayPolicy: string | undefined;
  lastTechnicalError: string | undefined;
  refreshInFlight: boolean;
  refreshQueued: boolean;
  bridgeListenersBound: boolean;
  lastAutoRetryAt: number;
}

export interface AutoBoosterControllerInternals extends ControllerRuntimeFields {
  configure(payload: AutoBoosterConfigPayload): Promise<void>;
  disable(tabId: number): Promise<void>;
  destroy(): Promise<void>;
  getDebugState(toastVisible?: boolean): AutoBoosterDebugState;
  ensureObserver(): void;
  handleDomMutation(): Promise<void>;
  refreshMediaTracking(): Promise<void>;
  runRefreshMediaTracking(): Promise<void>;
  scanForMediaElements(): Promise<void>;
  pruneDetachedSessions(): void;
  syncTrackedSessionsConfiguration(): void;
  setProcessingEnabled(enabled: boolean): void;
  startTelemetryLoop(): void;
  stopTelemetryLoop(): void;
  publishTelemetry(): void;
  syncAttachState(): void;
  reportStatus(): void;
  reportAttachFailure(): void;
  syncLocationState(): void;
  armGestureRetry(): void;
  disarmGestureRetry(): void;
  handleGestureRetry(): Promise<void>;
  ensurePendingMediaRetryListeners(mediaElement: HTMLMediaElement): void;
  clearPendingMediaRetryListeners(mediaElement: HTMLMediaElement): void;
  clearAllPendingMediaRetryListeners(): void;
  handleBridgeStatusEvent(event: Event): void;
  handleBridgeTelemetryEvent(event: Event): void;
  postBridgeCommand(payload: BridgeCommandPayload): void;
  postRuntimeMessage(message: unknown): Promise<void>;
  ensureBridgeListeners(): void;
  canDispatchBridgeEvents(): boolean;
  canBindBridgeListeners(): boolean;
  canRemoveBridgeListeners(): boolean;
}
