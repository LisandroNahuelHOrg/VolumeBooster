import type {
  AdvancedAudioSettings,
  CaptureSessionState,
  OffscreenMetadataPayload,
  OffscreenSessionStartPayload
} from "../../shared/types";

export interface OffscreenClient {
  ensureDocument(): Promise<void>;
  hasDocument(): Promise<boolean>;
  getSnapshot(): Promise<CaptureSessionState[]>;
  startSession(payload: OffscreenSessionStartPayload): Promise<CaptureSessionState[]>;
  setGain(tabId: number, gainPercent: number): Promise<CaptureSessionState[]>;
  setAdvancedAudioSettings(settings: AdvancedAudioSettings): Promise<CaptureSessionState[]>;
  updateMetadata(payload: OffscreenMetadataPayload): Promise<CaptureSessionState[]>;
  stopSession(tabId: number): Promise<CaptureSessionState[]>;
  stopAll(): Promise<CaptureSessionState[]>;
  closeIfIdle(sessionCount: number): Promise<void>;
}
