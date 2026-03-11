import type { AdvancedAudioSettings } from "../../shared/types";
import type {
  MediaElementSessionDebugState,
  MediaElementTelemetry
} from "./media-element-session-types";

export interface MediaElementSession {
  isConnectedTo(element: HTMLMediaElement): boolean;
  setGainPercent(gainPercent: number): void;
  setAdvancedAudioSettings(settings: AdvancedAudioSettings): void;
  setProcessingEnabled(enabled: boolean): void;
  sampleTelemetry(): MediaElementTelemetry;
  getDebugState(): MediaElementSessionDebugState;
  resumeProcessing(): Promise<boolean>;
  stop(): Promise<void>;
}
