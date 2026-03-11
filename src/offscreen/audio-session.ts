/**
 * @fileoverview Sesion robusta de captura por pestana usando `tabCapture` y el
 * engine premium Faust dentro del documento offscreen.
 */
import { audioSessionTestables } from "./audio-session/internal/audio-session-testables";
import type {
  AudioSessionCallbacks,
  AudioTelemetryPayload
} from "./audio-session/internal/audio-session-contract";
import { createAudioSessionState } from "./audio-session/internal/create-audio-session-state";
import { setAudioSessionGain } from "./audio-session/internal/lifecycle/set-audio-session-gain";
import { setAudioSessionSettings } from "./audio-session/internal/lifecycle/set-audio-session-settings";
import { startAudioSession } from "./audio-session/internal/lifecycle/start-audio-session";
import { stopAudioSession } from "./audio-session/internal/lifecycle/stop-audio-session";
import type { AudioSessionState } from "./audio-session/internal/audio-session-state";

export type { AudioSessionCallbacks, AudioTelemetryPayload };

/**
 * Encapsula una captura robusta de audio de pestana basada en `tabCapture`.
 */
export class AudioSession {
  private readonly state: AudioSessionState;

  constructor(
    gainPercent: number,
    advancedAudioSettings: AudioSessionState["currentSettings"],
    callbacks: AudioSessionCallbacks
  ) {
    this.state = createAudioSessionState(gainPercent, advancedAudioSettings, callbacks);
  }

  async start(streamId: string): Promise<void> {
    await startAudioSession(this.state, streamId);
  }

  setGainPercent(gainPercent: number): void {
    setAudioSessionGain(this.state, gainPercent);
  }

  setAdvancedAudioSettings(settings: AudioSessionState["currentSettings"]): void {
    setAudioSessionSettings(this.state, settings);
  }

  async stop(): Promise<void> {
    await stopAudioSession(this.state);
  }
}

if (import.meta.env.MODE === "test") {
  Object.defineProperty(AudioSession, "__testables", {
    value: audioSessionTestables,
    configurable: true
  });
}
