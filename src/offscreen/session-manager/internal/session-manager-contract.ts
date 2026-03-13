import type { AudioSessionCallbacks } from "../../audio-session";
import type {
  AdvancedAudioSettings,
  CaptureSessionState,
  OffscreenMetadataPayload,
  OffscreenSessionStartPayload,
  RuntimeResponse
} from "../../../shared/types";

export interface AudioSessionPort {
  start(streamId: string): Promise<void>;
  setGainPercent(gainPercent: number): void;
  setAdvancedAudioSettings(settings: AdvancedAudioSettings): void;
  stop(): Promise<void>;
}

export type AudioSessionFactory = (
  gainPercent: number,
  advancedAudioSettings: AdvancedAudioSettings,
  callbacks: AudioSessionCallbacks
) => AudioSessionPort;

export interface SessionEntry {
  audioSession: AudioSessionPort;
  state: CaptureSessionState;
}

export type SessionMap = Map<number, SessionEntry>;

export interface OffscreenSessionManager {
  startSession(payload: OffscreenSessionStartPayload): Promise<RuntimeResponse<{ sessions: CaptureSessionState[] }>>;
  setGain(tabId: number, gainPercent: number): Promise<RuntimeResponse<{ sessions: CaptureSessionState[] }>>;
  setAdvancedAudioSettings(settings: AdvancedAudioSettings): Promise<RuntimeResponse<{ sessions: CaptureSessionState[] }>>;
  updateMetadata(payload: OffscreenMetadataPayload): Promise<RuntimeResponse<{ sessions: CaptureSessionState[] }>>;
  stopSession(tabId: number): Promise<RuntimeResponse<{ sessions: CaptureSessionState[] }>>;
  stopAll(): Promise<RuntimeResponse<{ sessions: CaptureSessionState[] }>>;
  getSnapshot(): CaptureSessionState[];
}

export interface OffscreenSessionManagerRuntime {
  sessions: SessionMap;
  now: () => number;
  createAudioSession: AudioSessionFactory;
}
