import {
  AUTO_BOOSTER_ENABLE_MAIN_WORLD_BRIDGE,
  AUTO_BOOSTER_FAILURE_TOAST_MS,
  METER_SAMPLE_MS
} from "../shared/constants";
import { getDomainFromUrl, getDuckDuckGoFaviconUrl } from "../shared/domain";
import { message } from "../shared/messages";
import type {
  AdvancedAudioSettings,
  AutoActiveStrategy,
  AutoAttachReason,
  AutoAttachState,
  AutoBoosterDebugState,
  AutoBoosterConfigPayload,
  AutoBoosterScope,
  AutoSessionAttachFailedPayload,
  AutoSessionLevelPayload,
  AutoSessionStatusPayload,
  CaptureSessionState,
  LevelWarning
} from "../shared/types";
import {
  BRIDGE_COMMAND_EVENT,
  BRIDGE_STATUS_EVENT,
  BRIDGE_TELEMETRY_EVENT,
  createBridgeCommandEvent,
  createBridgeDefaultMetrics,
  isBridgeEventDetail,
  type BridgeCommandPayload,
  type BridgeStatusPayload,
  type BridgeTelemetryPayload
} from "./bridge-protocol";
import {
  MediaElementSession,
  MediaElementSessionError,
  type MediaElementTelemetry
} from "./media-element-session";

interface ControllerState {
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
  recoveryPending: boolean;
  recoveryUsed: boolean;
}

type TrackedSession = {
  session: MediaElementSession;
  lastTelemetry: MediaElementTelemetry;
};

export class AutoBoosterController {
  private readonly trackedSessions = new Map<HTMLMediaElement, TrackedSession>();
  private readonly processedElements = new WeakSet<HTMLMediaElement>();
  private readonly pendingMediaRetryControllers = new Map<HTMLMediaElement, AbortController>();
  private readonly historyCheckTimer = window.setInterval(() => {
    this.syncLocationState();
  }, 500);
  private telemetryTimer: number | null = null;
  private observer: MutationObserver | null = null;
  private gestureRetryAbortController: AbortController | null = null;
  private bridgeStatus: BridgeStatusPayload = {
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
  };
  private bridgeTelemetry: BridgeTelemetryPayload = {
    activeStrategy: "none",
    level: 0,
    warning: "none",
    metrics: createBridgeDefaultMetrics(),
    audioContextCount: 0,
    attachedNodeCount: 0,
    lastTelemetryAt: 0
  };
  private state: ControllerState = {
    tabId: null,
    scope: null,
    enabled: false,
    suspended: false,
    gainPercent: 100,
    advancedAudioSettings: null,
    attachState: "idle",
    activeStrategy: "none",
    recoveryPending: false,
    recoveryUsed: false
  };
  private lastLocationHref = window.location.href;
  private toastShownForHref: string | null = null;
  private lastTelemetryAt: number | null = null;
  private lastLevel = 0;
  private lastAudioContextState: AudioContextState | "none" = "none";
  private lastAutoplayPolicy: string | undefined;
  private lastTechnicalError: string | undefined;
  private refreshInFlight = false;
  private bridgeListenersBound = false;
  private lastAutoRetryAt = 0;

  async configure(payload: AutoBoosterConfigPayload): Promise<void> {
    if (AUTO_BOOSTER_ENABLE_MAIN_WORLD_BRIDGE) {
      this.ensureBridgeListeners();
    }
    this.state = {
      ...this.state,
      tabId: payload.tabId,
      scope: payload.scope,
      enabled: payload.enabled,
      suspended: payload.suspended,
      gainPercent: payload.gainPercent,
      advancedAudioSettings: payload.advancedAudioSettings,
      attachState: payload.enabled ? "observing" : "idle",
      attachReason: payload.enabled ? "no_media" : undefined,
      lastError: undefined,
      activeStrategy: "none",
      recoveryPending: false
    };
    this.lastTelemetryAt = null;
    this.lastLevel = 0;
    this.lastAudioContextState = "none";
    this.lastAutoplayPolicy = undefined;
    this.lastTechnicalError = undefined;
    this.lastAutoRetryAt = 0;

    if (!payload.enabled) {
      if (AUTO_BOOSTER_ENABLE_MAIN_WORLD_BRIDGE) {
        this.postBridgeCommand({
          type: "disable",
          payload: { tabId: payload.tabId }
        });
      }
      this.disarmGestureRetry();
      this.clearAllPendingMediaRetryListeners();
      this.setProcessingEnabled(false);
      this.stopTelemetryLoop();
      this.state.attachState = "idle";
      this.state.attachReason = undefined;
      this.state.activeStrategy = "none";
      this.reportStatus();
      return;
    }

    this.ensureObserver();

    if (payload.suspended) {
      if (AUTO_BOOSTER_ENABLE_MAIN_WORLD_BRIDGE) {
        this.postBridgeCommand({
          type: "configure",
          payload
        });
      }
      this.disarmGestureRetry();
      this.setProcessingEnabled(false);
      this.stopTelemetryLoop();
      this.state.attachState = "observing";
      this.state.attachReason = "no_media";
      this.reportStatus();
      return;
    }

    this.startTelemetryLoop();
    if (AUTO_BOOSTER_ENABLE_MAIN_WORLD_BRIDGE) {
      this.postBridgeCommand({
        type: "configure",
        payload
      });
    }
    this.reportStatus();
    void this.runRefreshMediaTracking();
  }

  async disable(tabId: number): Promise<void> {
    if (this.state.tabId !== tabId) {
      return;
    }

    this.state.enabled = false;
    this.state.scope = null;
    this.state.suspended = false;
    this.state.attachState = "idle";
    this.state.attachReason = undefined;
    this.state.lastError = undefined;
    this.state.activeStrategy = "none";
    this.state.recoveryPending = false;
    if (AUTO_BOOSTER_ENABLE_MAIN_WORLD_BRIDGE) {
      this.postBridgeCommand({
        type: "disable",
        payload: { tabId }
      });
    }
    this.disarmGestureRetry();
    this.clearAllPendingMediaRetryListeners();
    this.setProcessingEnabled(false);
    this.stopTelemetryLoop();
    this.reportStatus();
  }

  async destroy(): Promise<void> {
    this.stopTelemetryLoop();
    this.disarmGestureRetry();
    this.clearAllPendingMediaRetryListeners();
    this.observer?.disconnect();
    this.observer = null;
    window.clearInterval(this.historyCheckTimer);
    if (this.bridgeListenersBound) {
      if (this.canRemoveBridgeListeners()) {
        window.removeEventListener(BRIDGE_STATUS_EVENT, this.handleBridgeStatusEvent as EventListener);
        window.removeEventListener(BRIDGE_TELEMETRY_EVENT, this.handleBridgeTelemetryEvent as EventListener);
      }

      this.bridgeListenersBound = false;
    }

    for (const trackedSession of this.trackedSessions.values()) {
      await trackedSession.session.stop().catch(() => undefined);
    }

    this.trackedSessions.clear();
  }

  private ensureObserver(): void {
    if (this.observer) {
      return;
    }

    this.observer = new MutationObserver(() => {
      void this.handleDomMutation();
    });

    this.observer.observe(document.documentElement, {
      childList: true,
      subtree: true
    });
  }

  getDebugState(): AutoBoosterDebugState {
    const attachedElementCount = this.trackedSessions.size + this.bridgeStatus.attachedNodeCount;

    return {
      tabId: this.state.tabId,
      lane: "auto_media_element",
      enabled: this.state.enabled,
      suspended: this.state.suspended,
      scope: this.state.scope,
      attachState: this.state.attachState,
      attachReason: this.state.attachReason,
      ...(this.state.activeStrategy !== "none" ? { activeStrategy: this.state.activeStrategy } : {}),
      audioContextState: this.lastAudioContextState,
      autoplayPolicy: this.lastAutoplayPolicy,
      mediaElementCount: document.querySelectorAll("audio, video").length,
      attachedElementCount,
      ...(AUTO_BOOSTER_ENABLE_MAIN_WORLD_BRIDGE && this.bridgeStatus.audioContextCount > 0
        ? { bridgeContextCount: this.bridgeStatus.audioContextCount }
        : {}),
      ...(AUTO_BOOSTER_ENABLE_MAIN_WORLD_BRIDGE && this.bridgeStatus.attachedNodeCount > 0
        ? { bridgeAttachedNodeCount: this.bridgeStatus.attachedNodeCount }
        : {}),
      ...(this.state.recoveryPending ? { recoveryPending: true } : {}),
      ...(this.state.recoveryUsed ? { recoveryUsed: true } : {}),
      ...(AUTO_BOOSTER_ENABLE_MAIN_WORLD_BRIDGE && this.bridgeStatus.recoveryReason
        ? { recoveryReason: this.bridgeStatus.recoveryReason }
        : {}),
      lastTelemetryAt: Math.max(this.lastTelemetryAt ?? 0, this.bridgeTelemetry.lastTelemetryAt || 0) || null,
      lastLevel: Math.max(this.lastLevel, this.bridgeTelemetry.level),
      lastError: this.state.lastError,
      lastTechnicalError: this.lastTechnicalError,
      currentUrl: window.location.href
    };
  }

  private async handleDomMutation(): Promise<void> {
    this.pruneDetachedSessions();

    if (!this.state.enabled || !this.state.advancedAudioSettings) {
      return;
    }

    await this.runRefreshMediaTracking();
  }

  private async refreshMediaTracking(): Promise<void> {
    await this.scanForMediaElements();
    this.syncTrackedSessionsConfiguration();
    this.setProcessingEnabled(!this.state.suspended);
    this.syncAttachState();
    this.reportStatus();
  }

  private async runRefreshMediaTracking(): Promise<void> {
    if (this.refreshInFlight) {
      return;
    }

    this.refreshInFlight = true;

    try {
      await this.refreshMediaTracking();
    } finally {
      this.refreshInFlight = false;
    }
  }

  private async scanForMediaElements(): Promise<void> {
    if (!this.state.enabled || !this.state.advancedAudioSettings) {
      return;
    }

    const mediaElements = [...document.querySelectorAll<HTMLMediaElement>("audio, video")];

    for (const mediaElement of mediaElements) {
      if (this.processedElements.has(mediaElement)) {
        continue;
      }

      if (!isMediaElementReadyForAttach(mediaElement)) {
        this.ensurePendingMediaRetryListeners(mediaElement);
        continue;
      }

      try {
        const session = await MediaElementSession.create(
          mediaElement,
          this.state.gainPercent,
          this.state.advancedAudioSettings
        );

        this.processedElements.add(mediaElement);
        session.setProcessingEnabled(!this.state.suspended);
        this.trackedSessions.set(mediaElement, {
          session,
          lastTelemetry: session.sampleTelemetry()
        });
        this.clearPendingMediaRetryListeners(mediaElement);
        const debugState = session.getDebugState();
        this.lastAudioContextState = debugState.audioContextState;
        this.lastAutoplayPolicy = debugState.autoplayPolicy;
        this.lastTechnicalError = undefined;
        this.state.attachState = "attached";
        this.state.attachReason = undefined;
        this.state.lastError = undefined;
        this.disarmGestureRetry();
      } catch (error) {
        if (error instanceof MediaElementSessionError) {
          this.lastAudioContextState = error.debugState?.audioContextState ?? this.lastAudioContextState;
          this.lastAutoplayPolicy = error.debugState?.autoplayPolicy ?? this.lastAutoplayPolicy;
          this.lastTechnicalError = error.technicalMessage;

          if (error.reason === "autoplay_blocked") {
            this.ensurePendingMediaRetryListeners(mediaElement);
            this.state.attachState = "awaiting_user_gesture";
            this.state.attachReason = "autoplay_blocked";
            this.state.lastError = message("errorAutoAwaitingGesture");
            this.armGestureRetry();
            continue;
          }

          if (error.reason === "source_conflict") {
            this.processedElements.add(mediaElement);
            this.clearPendingMediaRetryListeners(mediaElement);
            this.state.attachState = "failed";
            this.state.attachReason = "source_conflict";
            this.state.lastError = message("errorAutoSourceConflict");
            this.reportAttachFailure();
            this.requestFailureToast();
            continue;
          }
        }

        this.state.attachState = "failed";
        this.state.attachReason = "attach_failed";
        this.state.lastError = message("errorAutoAttachFailed");
        this.lastTechnicalError = error instanceof Error ? error.message : String(error);
        this.reportAttachFailure();
        this.requestFailureToast();
      }
    }
  }

  private pruneDetachedSessions(): void {
    for (const [mediaElement, trackedSession] of this.trackedSessions) {
      if (document.contains(mediaElement)) {
        continue;
      }

      void trackedSession.session.stop().catch(() => undefined);
      this.trackedSessions.delete(mediaElement);
    }

    for (const [mediaElement, abortController] of this.pendingMediaRetryControllers) {
      if (document.contains(mediaElement)) {
        continue;
      }

      abortController.abort();
      this.pendingMediaRetryControllers.delete(mediaElement);
    }
  }

  private syncTrackedSessionsConfiguration(): void {
    if (!this.state.advancedAudioSettings) {
      return;
    }

    for (const trackedSession of this.trackedSessions.values()) {
      trackedSession.session.setGainPercent(this.state.gainPercent);
      trackedSession.session.setAdvancedAudioSettings(this.state.advancedAudioSettings);
    }
  }

  private setProcessingEnabled(enabled: boolean): void {
    for (const trackedSession of this.trackedSessions.values()) {
      trackedSession.session.setProcessingEnabled(enabled);
    }
  }

  private startTelemetryLoop(): void {
    if (this.telemetryTimer !== null) {
      return;
    }

    this.telemetryTimer = window.setInterval(() => {
      this.publishTelemetry();
    }, METER_SAMPLE_MS);
  }

  private stopTelemetryLoop(): void {
    if (this.telemetryTimer !== null) {
      window.clearInterval(this.telemetryTimer);
      this.telemetryTimer = null;
    }
  }

  private publishTelemetry(): void {
    if (
      !this.state.enabled ||
      this.state.suspended ||
      this.state.tabId === null ||
      this.state.attachState !== "attached"
    ) {
      return;
    }

    const telemetryValues = [...this.trackedSessions.values()].map((trackedSession) => {
      trackedSession.lastTelemetry = trackedSession.session.sampleTelemetry();
      return trackedSession.lastTelemetry;
    });

    if (AUTO_BOOSTER_ENABLE_MAIN_WORLD_BRIDGE && this.bridgeTelemetry.activeStrategy === "web_audio_bridge") {
      telemetryValues.push({
        level: this.bridgeTelemetry.level,
        warning: this.bridgeTelemetry.warning,
        metrics: {
          protectorActionDb: this.bridgeTelemetry.metrics.protectorActionDb,
          clipEvents: this.bridgeTelemetry.metrics.clipEvents,
          clipPeak: this.bridgeTelemetry.metrics.clipPeak,
          protectionBypassed: this.bridgeTelemetry.metrics.protectionBypassed,
          inputPeak: this.bridgeTelemetry.level,
          outputPeak: this.bridgeTelemetry.metrics.outputPeak
        }
      });
    }

    if (telemetryValues.length === 0) {
      this.syncAttachState();
      this.reportStatus();
      return;
    }

    const payload: AutoSessionLevelPayload = {
      tabId: this.state.tabId,
      level: roundTo(Math.max(...telemetryValues.map((telemetry) => telemetry.level)), 4),
      warning: pickHighestWarning(telemetryValues.map((telemetry) => telemetry.warning)),
      protectorActionDb: roundTo(
        Math.max(...telemetryValues.map((telemetry) => telemetry.metrics.protectorActionDb)),
        2
      ),
      clipEvents: telemetryValues.reduce((sum, telemetry) => sum + telemetry.metrics.clipEvents, 0),
      clipPeak: roundTo(Math.max(...telemetryValues.map((telemetry) => telemetry.metrics.clipPeak)), 4),
      protectionBypassed: telemetryValues.some((telemetry) => telemetry.metrics.protectionBypassed),
      outputPeak: roundTo(Math.max(...telemetryValues.map((telemetry) => telemetry.metrics.outputPeak)), 4)
    };
    this.lastTelemetryAt = Math.max(Date.now(), this.bridgeTelemetry.lastTelemetryAt || 0);
    this.lastLevel = payload.level;

    void this.postRuntimeMessage({
      type: "AUTO_SESSION_LEVEL_UPDATE",
      payload
    });
  }

  private syncAttachState(): void {
    if (!this.state.enabled) {
      this.state.attachState = "idle";
      this.state.attachReason = undefined;
      this.state.activeStrategy = "none";
      return;
    }

    if (this.trackedSessions.size > 0) {
      this.state.attachState = "attached";
      this.state.attachReason = undefined;
      this.state.activeStrategy = "media_element";
      return;
    }

    if (this.state.attachState === "awaiting_user_gesture") {
      this.state.attachState = "awaiting_user_gesture";
      this.state.attachReason = "autoplay_blocked";
      this.state.activeStrategy = "none";
      return;
    }

    if (this.state.attachState === "failed") {
      this.state.activeStrategy = "none";
      return;
    }

    this.state.attachState = "observing";
    this.state.attachReason = "no_media";
    this.state.activeStrategy = "none";
  }

  private reportStatus(): void {
    if (this.state.tabId === null) {
      return;
    }

    const payload: AutoSessionStatusPayload = {
      tabId: this.state.tabId,
      title: document.title || chrome.i18n.getMessage("tabUntitled") || "Untitled tab",
      url: window.location.href,
      domain: getDomainFromUrl(window.location.href),
      favIconUrl: getPageFaviconUrl(),
      autoAttachState: this.state.attachState,
      autoAttachReason: this.state.attachReason,
      autoBoosterScope: this.state.scope ?? undefined,
      autoActiveStrategy: this.state.activeStrategy,
      gainPercent: this.state.gainPercent,
      streamState: this.state.attachState === "attached" ? "active" : "inactive",
      engineStatus: this.state.attachState === "failed" ? "error" : "ready",
      engineLane: "auto_media_element",
      lastError: this.state.lastError
    };

    void this.postRuntimeMessage({
      type: "AUTO_SESSION_STATUS_UPDATE",
      payload
    });
  }

  private reportAttachFailure(): void {
    if (this.state.tabId === null) {
      return;
    }

    const payload: AutoSessionAttachFailedPayload = {
      tabId: this.state.tabId,
      title: document.title || chrome.i18n.getMessage("tabUntitled") || "Untitled tab",
      url: window.location.href,
      domain: getDomainFromUrl(window.location.href),
      favIconUrl: getPageFaviconUrl(),
      autoAttachState: "failed",
      autoAttachReason: this.state.attachReason,
      autoBoosterScope: this.state.scope ?? undefined,
      autoActiveStrategy: this.state.activeStrategy,
      gainPercent: this.state.gainPercent,
      engineLane: "auto_media_element",
      engineStatus: "error",
      streamState: "error",
      lastError: this.state.lastError
    };

    void this.postRuntimeMessage({
      type: "AUTO_SESSION_ATTACH_FAILED",
      payload
    });
  }

  private requestFailureToast(): void {
    if (
      this.state.scope !== "global" ||
      this.state.tabId === null ||
      this.toastShownForHref === window.location.href
    ) {
      return;
    }

    this.toastShownForHref = window.location.href;
    this.showFailureToast();

    void this.postRuntimeMessage({
      type: "AUTO_SESSION_TOAST_REQUESTED",
      payload: {
        tabId: this.state.tabId,
        reason: this.state.attachReason ?? "attach_failed"
      }
    });
  }

  private showFailureToast(): void {
    const toast = document.createElement("div");
    toast.className = "prism-auto-booster-toast";
    toast.textContent =
      chrome.i18n.getMessage("autoBoosterFailureToast") ||
      "Automatic booster could not hook this page. Use the manual booster from the popup.";

    Object.assign(toast.style, {
      position: "fixed",
      right: "20px",
      bottom: "20px",
      zIndex: "2147483647",
      maxWidth: "360px",
      padding: "14px 16px",
      borderRadius: "16px",
      background:
        "linear-gradient(135deg, rgba(20,26,34,0.96), rgba(30,12,12,0.94))",
      border: "1px solid rgba(245,113,113,0.4)",
      boxShadow: "0 18px 45px rgba(0,0,0,0.35)",
      color: "#f6f0eb",
      fontFamily: "\"Segoe UI\", sans-serif",
      fontSize: "13px",
      lineHeight: "1.45"
    } satisfies Partial<CSSStyleDeclaration>);

    document.documentElement.appendChild(toast);

    window.setTimeout(() => {
      toast.remove();
    }, AUTO_BOOSTER_FAILURE_TOAST_MS);
  }

  private syncLocationState(): void {
    if (window.location.href === this.lastLocationHref) {
      if (
        this.state.enabled &&
        !this.state.suspended &&
        this.state.advancedAudioSettings &&
        this.trackedSessions.size === 0
      ) {
        const shouldRetryObserving =
          this.state.attachState === "observing" && this.state.attachReason === "no_media";
        const shouldRetryAwaiting = this.state.attachState === "awaiting_user_gesture";

        if (shouldRetryObserving || shouldRetryAwaiting) {
          const now = Date.now();
          const retryIntervalMs = shouldRetryAwaiting ? 1250 : 500;

          if (now - this.lastAutoRetryAt >= retryIntervalMs) {
            this.lastAutoRetryAt = now;
            void this.runRefreshMediaTracking();
          }
        }
      }

      return;
    }

    this.lastLocationHref = window.location.href;
    this.toastShownForHref = null;
    this.state.recoveryPending = false;
    this.lastAutoRetryAt = 0;
    this.pruneDetachedSessions();
    this.lastTechnicalError = undefined;
    this.syncAttachState();
    this.reportStatus();
    void this.runRefreshMediaTracking();
  }

  private armGestureRetry(): void {
    if (this.gestureRetryAbortController) {
      return;
    }

    const abortController = new AbortController();
    this.gestureRetryAbortController = abortController;
    const retry = () => {
      void this.handleGestureRetry();
    };

    for (const eventName of ["pointerdown", "keydown", "touchstart"]) {
      window.addEventListener(eventName, retry, {
        capture: true,
        once: true,
        signal: abortController.signal
      });
    }

    document.addEventListener("play", retry, {
      capture: true,
      once: true,
      signal: abortController.signal
    });
  }

  private disarmGestureRetry(): void {
    this.gestureRetryAbortController?.abort();
    this.gestureRetryAbortController = null;
  }

  private async handleGestureRetry(): Promise<void> {
    this.disarmGestureRetry();

    if (!this.state.enabled || this.state.suspended) {
      return;
    }

    if (this.state.attachState !== "awaiting_user_gesture") {
      return;
    }

    this.state.attachState = "observing";
    this.state.attachReason = "no_media";
    this.state.lastError = undefined;
    this.lastTechnicalError = undefined;
    await this.runRefreshMediaTracking();
    this.syncAttachState();
    this.reportStatus();
  }

  private async postRuntimeMessage(message: unknown): Promise<void> {
    try {
      await chrome.runtime.sendMessage(message);
    } catch {
      // The worker may be temporarily asleep; the next poll will reconcile state.
    }
  }

  private ensurePendingMediaRetryListeners(mediaElement: HTMLMediaElement): void {
    if (this.pendingMediaRetryControllers.has(mediaElement)) {
      return;
    }

    if (typeof mediaElement.addEventListener !== "function") {
      return;
    }

    const abortController = new AbortController();
    const retry = () => {
      if (!this.state.enabled || this.state.suspended) {
        return;
      }

      if (isMediaElementReadyForAttach(mediaElement)) {
        this.clearPendingMediaRetryListeners(mediaElement);
        void this.runRefreshMediaTracking();
      }
    };

    for (const eventName of ["play", "playing", "canplay", "loadedmetadata", "timeupdate"]) {
      mediaElement.addEventListener(eventName, retry, {
        signal: abortController.signal
      });
    }

    this.pendingMediaRetryControllers.set(mediaElement, abortController);
  }

  private clearPendingMediaRetryListeners(mediaElement: HTMLMediaElement): void {
    const abortController = this.pendingMediaRetryControllers.get(mediaElement);

    if (!abortController) {
      return;
    }

    abortController.abort();
    this.pendingMediaRetryControllers.delete(mediaElement);
  }

  private clearAllPendingMediaRetryListeners(): void {
    for (const abortController of this.pendingMediaRetryControllers.values()) {
      abortController.abort();
    }

    this.pendingMediaRetryControllers.clear();
  }

  private readonly handleBridgeStatusEvent = (event: Event): void => {
    const customEvent = event as CustomEvent<unknown>;

    if (!isBridgeEventDetail<BridgeStatusPayload>(customEvent.detail)) {
      return;
    }

    this.bridgeStatus = customEvent.detail.payload;
    this.lastAudioContextState = this.bridgeStatus.audioContextState;
    this.lastAutoplayPolicy = this.bridgeStatus.autoplayPolicy;
    this.lastTechnicalError = this.bridgeStatus.lastTechnicalError ?? this.lastTechnicalError;
    this.state.recoveryPending = Boolean(this.bridgeStatus.recoveryPending);
    this.state.recoveryUsed = Boolean(this.bridgeStatus.recoveryUsed);

    if (this.bridgeStatus.attachState === "awaiting_user_gesture") {
      this.state.lastError = message("errorAutoAwaitingGesture");
      this.armGestureRetry();
    } else if (this.bridgeStatus.attachState === "attached") {
      this.state.lastError = undefined;
      this.disarmGestureRetry();
    }

    this.syncAttachState();
    this.reportStatus();
  };

  private readonly handleBridgeTelemetryEvent = (event: Event): void => {
    const customEvent = event as CustomEvent<unknown>;

    if (!isBridgeEventDetail<BridgeTelemetryPayload>(customEvent.detail)) {
      return;
    }

    this.bridgeTelemetry = customEvent.detail.payload;
    this.lastTelemetryAt = Math.max(this.lastTelemetryAt ?? 0, this.bridgeTelemetry.lastTelemetryAt);
    this.lastLevel = Math.max(this.lastLevel, this.bridgeTelemetry.level);
  };

  private postBridgeCommand(payload: BridgeCommandPayload): void {
    if (!this.canDispatchBridgeEvents()) {
      return;
    }

    window.dispatchEvent(createBridgeCommandEvent(payload));
  }

  private ensureBridgeListeners(): void {
    if (this.bridgeListenersBound || !this.canBindBridgeListeners()) {
      return;
    }

    window.addEventListener(BRIDGE_STATUS_EVENT, this.handleBridgeStatusEvent as EventListener);
    window.addEventListener(BRIDGE_TELEMETRY_EVENT, this.handleBridgeTelemetryEvent as EventListener);
    this.bridgeListenersBound = true;
  }

  private canDispatchBridgeEvents(): boolean {
    return typeof window.dispatchEvent === "function" && typeof CustomEvent === "function";
  }

  private canBindBridgeListeners(): boolean {
    return typeof window.addEventListener === "function";
  }

  private canRemoveBridgeListeners(): boolean {
    return typeof window.removeEventListener === "function";
  }
}

function getPageFaviconUrl(): string | undefined {
  const explicitFavicon =
    document.querySelector<HTMLLinkElement>('link[rel~="icon"][href]')?.href ??
    document.querySelector<HTMLLinkElement>('link[rel="shortcut icon"][href]')?.href;

  if (explicitFavicon) {
    return explicitFavicon;
  }

  return getDuckDuckGoFaviconUrl(getDomainFromUrl(window.location.href));
}

function roundTo(value: number, precision: number): number {
  const factor = Math.pow(10, precision);
  return Math.round(value * factor) / factor;
}

function isMediaElementReadyForAttach(mediaElement: HTMLMediaElement): boolean {
  const haveCurrentData =
    typeof HTMLMediaElement !== "undefined" ? HTMLMediaElement.HAVE_CURRENT_DATA : 2;
  const hasSource = Boolean(mediaElement.currentSrc || mediaElement.srcObject);
  const playbackRanges = mediaElement.played?.length ?? 0;
  const hasPlaybackActivity = mediaElement.currentTime > 0 || playbackRanges > 0;

  if (!hasSource || mediaElement.ended) {
    return false;
  }

  return (
    !mediaElement.paused &&
    hasPlaybackActivity &&
    mediaElement.readyState >= haveCurrentData
  );
}

function pickHighestWarning(values: LevelWarning[]): LevelWarning {
  if (values.includes("danger")) {
    return "danger";
  }

  if (values.includes("high")) {
    return "high";
  }

  return "none";
}
