/**
 * @fileoverview Manager del documento offscreen que mantiene las sesiones de
 * captura robusta por pestaña y sincroniza su estado con el worker.
 */
import { DEFAULT_GAIN_PERCENT } from "../shared/constants";
import {
  createDefaultMetrics,
  deriveWarningFromMetrics,
  isProtectionBypassedSettings
} from "../shared/audio-settings";
import { fail, message, ok } from "../shared/messages";
import type {
  AdvancedAudioSettings,
  CaptureSessionState,
  OffscreenMetadataPayload,
  OffscreenSessionStartPayload,
  RuntimeResponse
} from "../shared/types";
import { AudioSession, type AudioSessionCallbacks } from "./audio-session";

interface SessionEntry {
  audioSession: AudioSessionPort;
  state: CaptureSessionState;
}

/**
 * Puerto mínimo que el manager necesita de una implementación de sesión de
 * audio.
 */
export interface AudioSessionPort {
  start(streamId: string): Promise<void>;
  setGainPercent(gainPercent: number): void;
  setAdvancedAudioSettings(settings: AdvancedAudioSettings): void;
  stop(): Promise<void>;
}

/**
 * Factoría inyectable para construir sesiones de audio, usada también en
 * tests.
 */
export type AudioSessionFactory = (
  gainPercent: number,
  advancedAudioSettings: AdvancedAudioSettings,
  callbacks: AudioSessionCallbacks
) => AudioSessionPort;

/**
 * Gestiona el ciclo de vida de las sesiones robustas que viven en offscreen.
 */
export class OffscreenSessionManager {
  private readonly sessions = new Map<number, SessionEntry>();

  constructor(
    private readonly now = () => Date.now(),
    private readonly createAudioSession: AudioSessionFactory = (
      gainPercent,
      advancedAudioSettings,
      callbacks
    ) => new AudioSession(gainPercent, advancedAudioSettings, callbacks)
  ) {}

  async startSession(payload: OffscreenSessionStartPayload): Promise<RuntimeResponse<{ sessions: CaptureSessionState[] }>> {
    try {
      await this.stopSessionInternal(payload.tabId);

      const state: CaptureSessionState = {
        tabId: payload.tabId,
        title: payload.title,
        url: payload.url,
        domain: payload.domain,
        favIconUrl: payload.favIconUrl,
        gainPercent: payload.gainPercent,
        engineLane: "manual_tab_capture",
        autoAttachState: "idle",
        streamState: "pending",
        engineStatus: "loading",
        level: 0,
        warning: "none",
        protectorActionDb: 0,
        clipEvents: 0,
        clipPeak: 0,
        protectionBypassed: isProtectionBypassedSettings(payload.advancedAudioSettings),
        outputPeak: 0,
        updatedAt: this.now()
      };

      const audioSession = this.createAudioSession(payload.gainPercent, payload.advancedAudioSettings, {
        onTelemetry: ({ level, warning, metrics }) => {
          const currentSession = this.sessions.get(payload.tabId);

          if (!currentSession) {
            return;
          }

          currentSession.state.level = level;
          currentSession.state.warning = warning;
          currentSession.state.protectorActionDb = metrics.protectorActionDb;
          currentSession.state.clipEvents = metrics.clipEvents;
          currentSession.state.clipPeak = metrics.clipPeak;
          currentSession.state.protectionBypassed = metrics.protectionBypassed;
          currentSession.state.outputPeak = metrics.outputPeak;
          postRuntimeMessage({
            type: "SESSION_LEVEL_UPDATE",
            payload: {
              tabId: payload.tabId,
              level,
              warning,
              protectorActionDb: metrics.protectorActionDb,
              clipEvents: metrics.clipEvents,
              clipPeak: metrics.clipPeak,
              protectionBypassed: metrics.protectionBypassed,
              outputPeak: metrics.outputPeak
            }
          });
        },
        onFatalError: (errorMessage) => {
          void this.handleSessionFatalError(payload.tabId, errorMessage);
        }
      });

      this.sessions.set(payload.tabId, { audioSession, state });
      this.publishStatus(state);
      await audioSession.start(payload.streamId);

      state.streamState = "active";
      state.engineStatus = "ready";
      state.warning = deriveWarningFromMetrics(
        createDefaultMetrics(isProtectionBypassedSettings(payload.advancedAudioSettings))
      );
      this.publishStatus(state);

      return ok({ sessions: this.getSnapshot() });
    } catch (error) {
      const entry = this.sessions.get(payload.tabId);

      if (entry) {
        await entry.audioSession.stop().catch(() => undefined);
        this.sessions.delete(payload.tabId);
      }

      return fail(message("errorAudioPipelineStart"));
    }
  }

  /**
   * Actualiza el gain de una sesión activa.
   */
  async setGain(tabId: number, gainPercent: number): Promise<RuntimeResponse<{ sessions: CaptureSessionState[] }>> {
    const entry = this.sessions.get(tabId);

    if (!entry) {
      return fail(message("errorNoRunningSession"));
    }

    entry.audioSession.setGainPercent(gainPercent);
    entry.state.gainPercent = gainPercent;
    entry.state.protectorActionDb = 0;
    entry.state.clipEvents = 0;
    entry.state.clipPeak = 0;
    entry.state.outputPeak = 0;
    this.publishStatus(entry.state);
    return ok({ sessions: this.getSnapshot() });
  }

  /**
   * Reaplica los ajustes avanzados globales a todas las sesiones activas.
   */
  async setAdvancedAudioSettings(
    settings: AdvancedAudioSettings
  ): Promise<RuntimeResponse<{ sessions: CaptureSessionState[] }>> {
    for (const entry of this.sessions.values()) {
      entry.audioSession.setAdvancedAudioSettings(settings);
      entry.state.protectorActionDb = 0;
      entry.state.clipEvents = 0;
      entry.state.clipPeak = 0;
      entry.state.protectionBypassed = isProtectionBypassedSettings(settings);
      entry.state.outputPeak = 0;
      entry.state.warning = "none";
    }

    return ok({ sessions: this.getSnapshot() });
  }

  /**
   * Actualiza los metadatos visibles de una sesión ya iniciada.
   */
  async updateMetadata(
    payload: OffscreenMetadataPayload
  ): Promise<RuntimeResponse<{ sessions: CaptureSessionState[] }>> {
    const entry = this.sessions.get(payload.tabId);

    if (!entry) {
      return fail(message("errorNoRunningSession"));
    }

    entry.state.title = payload.title;
    entry.state.url = payload.url;
    entry.state.domain = payload.domain;
    entry.state.favIconUrl = payload.favIconUrl;

    if (payload.gainPercent !== undefined && payload.gainPercent !== entry.state.gainPercent) {
      entry.audioSession.setGainPercent(payload.gainPercent);
      entry.state.gainPercent = payload.gainPercent;
      entry.state.protectorActionDb = 0;
      entry.state.clipEvents = 0;
      entry.state.clipPeak = 0;
      entry.state.outputPeak = 0;
    }

    if (payload.advancedAudioSettings) {
      entry.audioSession.setAdvancedAudioSettings(payload.advancedAudioSettings);
      entry.state.protectorActionDb = 0;
      entry.state.clipEvents = 0;
      entry.state.clipPeak = 0;
      entry.state.protectionBypassed = isProtectionBypassedSettings(payload.advancedAudioSettings);
      entry.state.outputPeak = 0;
    }

    entry.state.updatedAt = this.now();
    this.publishStatus(entry.state);
    return ok({ sessions: this.getSnapshot() });
  }

  /**
   * Detiene una sesión concreta.
   */
  async stopSession(tabId: number): Promise<RuntimeResponse<{ sessions: CaptureSessionState[] }>> {
    await this.stopSessionInternal(tabId);
    return ok({ sessions: this.getSnapshot() });
  }

  /**
   * Detiene todas las sesiones activas.
   */
  async stopAll(): Promise<RuntimeResponse<{ sessions: CaptureSessionState[] }>> {
    for (const tabId of [...this.sessions.keys()]) {
      await this.stopSessionInternal(tabId);
    }

    return ok({ sessions: this.getSnapshot() });
  }

  /**
   * Devuelve una snapshot inmutable del estado actual de todas las sesiones.
   */
  getSnapshot(): CaptureSessionState[] {
    return [...this.sessions.values()].map((entry) => ({ ...entry.state }));
  }

  private async handleSessionFatalError(
    tabId: number,
    errorMessage: CaptureSessionState["lastError"]
  ): Promise<void> {
    const entry = this.sessions.get(tabId);

    if (!entry || entry.state.engineStatus === "error") {
      return;
    }

    entry.state.streamState = "error";
    entry.state.engineStatus = "error";
    entry.state.level = 0;
    entry.state.warning = "danger";
    entry.state.protectorActionDb = 0;
    entry.state.clipEvents = 0;
    entry.state.clipPeak = 0;
    entry.state.outputPeak = 0;
    entry.state.lastError = errorMessage;
    entry.state.updatedAt = this.now();
    this.publishStatus(entry.state);
    await entry.audioSession.stop().catch(() => undefined);
  }

  private async stopSessionInternal(tabId: number): Promise<void> {
    const entry = this.sessions.get(tabId);

    if (!entry) {
      return;
    }

    entry.state.streamState = "inactive";
    entry.state.engineStatus = "ready";
    await entry.audioSession.stop();
    this.sessions.delete(tabId);
    postRuntimeMessage({
      type: "SESSION_STATUS_UPDATE",
      payload: {
        tabId,
        streamState: "inactive",
        engineStatus: "ready",
        gainPercent: entry.state.gainPercent
      }
    });
  }

  private publishStatus(state: CaptureSessionState): void {
    postRuntimeMessage({
      type: "SESSION_STATUS_UPDATE",
      payload: {
        tabId: state.tabId,
        streamState: state.streamState,
        engineStatus: state.engineStatus,
        gainPercent: state.gainPercent,
        lastError: state.lastError
      }
    });
  }
}

/**
 * Envía mensajes al worker sin fallar si el receptor está dormido
 * temporalmente.
 */
function postRuntimeMessage(message: unknown): void {
  try {
    const maybePromise = chrome.runtime.sendMessage(message) as Promise<unknown> | undefined;

    if (maybePromise && typeof maybePromise.catch === "function") {
      void maybePromise.catch(() => undefined);
    }
  } catch {
    // The service worker may be temporarily unavailable; the next state sync will recover.
  }
}
