/**
 * @fileoverview Controlador principal del modo `All sites`, responsable de
 * descubrir media elements, adjuntar sesiones automáticas y publicar estado y
 * telemetría al worker.
 */
import {
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
import { getCurrentFrameContext } from "./frame-runtime";
import {
  MediaElementSession,
  MediaElementSessionError,
  shouldAttemptAutomaticMediaAttach,
  type MediaElementTelemetry
} from "./media-element-session";
import { discoverMediaElements } from "./media-discovery";
import { getI18nMessageSafe, sendRuntimeMessageSafe } from "./runtime-api";

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
}

/**
 * Sesión de media element activa junto con su última telemetría muestreada.
 */
type TrackedSession = {
  session: MediaElementSession;
  lastTelemetry: MediaElementTelemetry;
};

/**
 * Orquesta el auto-booster basado en `audio`/`video` dentro de la página
 * actual y mantiene sincronizado el estado con el worker.
 */
export class AutoBoosterController {
  private readonly frameContext = getCurrentFrameContext();
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
    activeStrategy: "none"
  };
  private lastLocationHref = window.location.href;
  private lastTelemetryAt: number | null = null;
  private lastLevel = 0;
  private lastAudioContextState: AudioContextState | "none" = "none";
  private lastAutoplayPolicy: string | undefined;
  private lastTechnicalError: string | undefined;
  private refreshInFlight = false;
  private refreshQueued = false;
  private bridgeListenersBound = false;

  async configure(payload: AutoBoosterConfigPayload): Promise<void> {
    this.ensureBridgeListeners();
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
      activeStrategy: "none"
    };
    this.lastTelemetryAt = null;
    this.lastLevel = 0;
    this.lastAudioContextState = "none";
    this.lastAutoplayPolicy = undefined;
    this.lastTechnicalError = undefined;

    if (!payload.enabled) {
      this.postBridgeCommand({
        type: "disable",
        payload: { tabId: payload.tabId }
      });
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
      this.postBridgeCommand({
        type: "configure",
        payload
      });
      this.disarmGestureRetry();
      this.syncTrackedSessionsConfiguration();
      this.setProcessingEnabled(false);
      this.stopTelemetryLoop();
      this.state.attachState = "observing";
      this.state.attachReason = "no_media";
      this.reportStatus();
      return;
    }

    this.startTelemetryLoop();
    this.syncTrackedSessionsConfiguration();
    this.setProcessingEnabled(true);
    this.postBridgeCommand({
      type: "configure",
      payload
    });
    this.syncAttachState();
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
    this.postBridgeCommand({
      type: "disable",
      payload: { tabId }
    });
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

  /**
   * Devuelve el estado de depuración agregado del auto-booster en la pestaña.
   */
  getDebugState(toastVisible = false): AutoBoosterDebugState {
    const attachedElementCount = this.trackedSessions.size + this.bridgeStatus.attachedNodeCount;
    const attachedFrameCount = this.state.attachState === "attached" ? 1 : 0;

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
      mediaElementCount: discoverMediaElements().length,
      attachedElementCount,
      frameCount: 1,
      readyFrameCount: 1,
      attachedFrameCount,
      toastVisible,
      ...(this.bridgeStatus.audioContextCount > 0 ? { bridgeContextCount: this.bridgeStatus.audioContextCount } : {}),
      ...(this.bridgeStatus.attachedNodeCount > 0
        ? { bridgeAttachedNodeCount: this.bridgeStatus.attachedNodeCount }
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

  /**
   * Vuelve a escanear la página buscando media elements adjuntables y
   * reintenta automáticamente si aparecen tarde.
   */
  private async refreshMediaTracking(): Promise<void> {
    await this.scanForMediaElements();
    this.syncTrackedSessionsConfiguration();
    this.setProcessingEnabled(!this.state.suspended);
    this.syncAttachState();
    this.reportStatus();
  }

  private async runRefreshMediaTracking(): Promise<void> {
    if (this.refreshInFlight) {
      this.refreshQueued = true;
      return;
    }

    this.refreshInFlight = true;

    try {
      do {
        this.refreshQueued = false;
        await this.refreshMediaTracking();
      } while (this.refreshQueued);
    } finally {
      this.refreshInFlight = false;
    }
  }

  /**
   * Busca elementos `audio` y `video` utilizables y crea sesiones automáticas
   * cuando la reproducción ya está realmente en curso.
   */
  private async scanForMediaElements(): Promise<void> {
    if (!this.state.enabled || !this.state.advancedAudioSettings) {
      return;
    }

    const mediaElements = discoverMediaElements();

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
        this.state.activeStrategy = "media_element";
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
            // No marcar como procesado: el conflicto puede resolverse si la
            // fuente se recrea o el otro AudioContext se cierra (SPAs, players dinámicos).
            this.clearPendingMediaRetryListeners(mediaElement);
            this.ensurePendingMediaRetryListeners(mediaElement);
            if (this.state.attachState !== "attached") {
              this.state.attachState = "observing";
              this.state.attachReason = "no_media";
            }

            continue;
          }
        }

        this.state.attachState = "failed";
        this.state.attachReason = "attach_failed";
        this.state.lastError = message("errorAutoAttachFailed");
        this.lastTechnicalError = error instanceof Error ? error.message : String(error);
        this.reportAttachFailure();
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

  /**
   * Publica nivel, warning y métricas del lane automático al worker.
   */
  private publishTelemetry(): void {
    if (!this.state.enabled || this.state.suspended || this.state.tabId === null) {
      return;
    }

    if (
      (this.state.attachState === "observing" && this.state.attachReason === "no_media") ||
      this.state.attachState === "awaiting_user_gesture"
    ) {
      return;
    }

    const previousAttachState = this.state.attachState;
    const previousAttachReason = this.state.attachReason;
    const previousActiveStrategy = this.state.activeStrategy;

    const telemetryValues = [...this.trackedSessions.values()].map((trackedSession) => {
      const debugState = trackedSession.session.getDebugState();

      this.lastAudioContextState = debugState.audioContextState;
      this.lastAutoplayPolicy = debugState.autoplayPolicy;

      trackedSession.lastTelemetry = trackedSession.session.sampleTelemetry();
      return trackedSession.lastTelemetry;
    });

    const bridgeTelemetryValue =
      this.bridgeStatus.attachState === "attached" && this.bridgeTelemetry.activeStrategy === "web_audio_bridge"
        ? {
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
          }
        : null;

    if (bridgeTelemetryValue) {
      telemetryValues.push({
        ...bridgeTelemetryValue
      });
    }

    if (telemetryValues.length === 0) {
      this.lastTelemetryAt = null;
      this.lastLevel = 0;
      this.syncAttachState();
      if (
        previousAttachState !== this.state.attachState ||
        previousAttachReason !== this.state.attachReason ||
        previousActiveStrategy !== this.state.activeStrategy
      ) {
        this.reportStatus();
      }
      return;
    }

    const aggregatedTelemetry = {
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
    this.lastLevel = aggregatedTelemetry.level;

    const payload: AutoSessionLevelPayload = {
      tabId: this.state.tabId,
      isTopFrame: this.frameContext.isTopFrame,
      frameUrl: this.frameContext.frameUrl,
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
    this.lastTelemetryAt = Math.max(Date.now(), this.lastTelemetryAt || 0);
    this.lastLevel = payload.level;

    void this.postRuntimeMessage({
      type: "AUTO_SESSION_LEVEL_UPDATE",
      payload
    });

    this.syncAttachState();
    if (
      previousAttachState !== this.state.attachState ||
      previousAttachReason !== this.state.attachReason ||
      previousActiveStrategy !== this.state.activeStrategy
    ) {
      this.reportStatus();
    }
  }

  /**
   * Deriva el estado visible de attach a partir de las sesiones activas y del
   * contexto de bloqueo actual.
   */
  private syncAttachState(): void {
    if (!this.state.enabled) {
      this.state.attachState = "idle";
      this.state.attachReason = undefined;
      this.state.activeStrategy = "none";
      return;
    }

    const hasMediaSession = [...this.trackedSessions.values()].some((trackedSession) =>
      trackedSession.session.getDebugState().audioContextState === "running"
    );
    const hasBridgeStrategy =
      this.bridgeStatus.attachState === "attached" && this.bridgeTelemetry.activeStrategy === "web_audio_bridge";

    if (hasMediaSession || hasBridgeStrategy) {
      this.state.attachState = "attached";
      this.state.attachReason = undefined;
      this.state.activeStrategy =
        hasMediaSession && hasBridgeStrategy
          ? "hybrid"
          : hasBridgeStrategy
            ? "web_audio_bridge"
            : "media_element";
      return;
    }

    if (
      this.state.attachState === "awaiting_user_gesture" ||
      this.bridgeStatus.attachState === "awaiting_user_gesture"
    ) {
      this.state.attachState = "awaiting_user_gesture";
      this.state.attachReason = "autoplay_blocked";
      this.state.activeStrategy = "none";
      return;
    }

    if (this.state.attachState === "failed" || this.bridgeStatus.attachState === "failed") {
      this.state.attachState = "failed";
      this.state.attachReason = this.state.attachReason ?? this.bridgeStatus.attachReason ?? "attach_failed";
      this.state.activeStrategy = "none";
      return;
    }

    this.state.attachState = "observing";
    this.state.attachReason = "no_media";
    this.state.activeStrategy = "none";
  }

  /**
   * Publica el estado resumido de la pestaña al worker para reflejarlo en el
   * popup.
   */
  private reportStatus(): void {
    if (this.state.tabId === null) {
      return;
    }

    const payload: AutoSessionStatusPayload = {
      tabId: this.state.tabId,
      title: document.title || getI18nMessageSafe("tabUntitled") || "Untitled tab",
      url: window.location.href,
      domain: getDomainFromUrl(window.location.href),
      favIconUrl: getPageFaviconUrl(),
      isTopFrame: this.frameContext.isTopFrame,
      frameUrl: this.frameContext.frameUrl,
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

  /**
   * Notifica al worker que el attach automático falló de forma real.
   */
  private reportAttachFailure(): void {
    if (this.state.tabId === null) {
      return;
    }

    const payload: AutoSessionAttachFailedPayload = {
      tabId: this.state.tabId,
      title: document.title || getI18nMessageSafe("tabUntitled") || "Untitled tab",
      url: window.location.href,
      domain: getDomainFromUrl(window.location.href),
      favIconUrl: getPageFaviconUrl(),
      isTopFrame: this.frameContext.isTopFrame,
      frameUrl: this.frameContext.frameUrl,
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

  /**
   * Reacciona a cambios de navegación SPA y mantiene el lane automático en
   * reintento cuando todavía no hay media lista.
   */
  private syncLocationState(): void {
    if (window.location.href === this.lastLocationHref) {
      if (this.state.enabled && !this.state.suspended && this.state.advancedAudioSettings) {
        const previousAttachState = this.state.attachState;
        const previousAttachReason = this.state.attachReason;
        const previousActiveStrategy = this.state.activeStrategy;

        this.syncAttachState();

        if (
          previousAttachState !== this.state.attachState ||
          previousAttachReason !== this.state.attachReason ||
          previousActiveStrategy !== this.state.activeStrategy
        ) {
          this.reportStatus();
        }
      }

      return;
    }

    this.lastLocationHref = window.location.href;
    this.pruneDetachedSessions();
    this.lastTechnicalError = undefined;
    this.syncAttachState();
    this.reportStatus();
    void this.runRefreshMediaTracking();
  }

  /**
   * Instala listeners de gesto para reintentar attach cuando Chrome bloquea
   * temporalmente Web Audio por autoplay policy.
   */
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
    await sendRuntimeMessageSafe(message);
  }

  /**
   * Registra listeners temporales sobre un media element no listo todavía para
   * reintentar el attach cuando empiece a reproducir realmente.
   */
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

    for (const eventName of [
      "play",
      "playing",
      "canplay",
      "loadedmetadata",
      "timeupdate",
      "volumechange"
    ]) {
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

/**
 * Devuelve el favicon más útil disponible para la página actual.
 */
function getPageFaviconUrl(): string | undefined {
  const explicitFavicon =
    document.querySelector<HTMLLinkElement>('link[rel~="icon"][href]')?.href ??
    document.querySelector<HTMLLinkElement>('link[rel="shortcut icon"][href]')?.href;

  if (explicitFavicon) {
    return explicitFavicon;
  }

  return getDuckDuckGoFaviconUrl(getDomainFromUrl(window.location.href));
}

/**
 * Redondea un valor numérico a la precisión indicada.
 */
function roundTo(value: number, precision: number): number {
  const factor = Math.pow(10, precision);
  return Math.round(value * factor) / factor;
}

/**
 * Determina si un media element ya tiene suficiente información y reproducción
 * real como para adjuntarle una sesión Web Audio sin caer en errores de
 * autoplay prematuros.
 */
function isMediaElementReadyForAttach(mediaElement: HTMLMediaElement): boolean {
  return shouldAttemptAutomaticMediaAttach(mediaElement);
}

/**
 * Elige el warning más severo dentro de un conjunto de warnings muestreados.
 */
function pickHighestWarning(values: LevelWarning[]): LevelWarning {
  if (values.includes("danger")) {
    return "danger";
  }

  if (values.includes("high")) {
    return "high";
  }

  return "none";
}

