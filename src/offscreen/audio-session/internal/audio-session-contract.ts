import type {
  DspRuntimeMetrics,
  LevelWarning,
  LocalizedMessage
} from "../../../shared/types";

export interface AudioTelemetryPayload {
  level: number;
  warning: LevelWarning;
  metrics: DspRuntimeMetrics;
}

/**
 * Callbacks emitidos por la sesion robusta para reportar telemetria al
 * manager.
 */
export interface AudioSessionCallbacks {
  onTelemetry: (payload: AudioTelemetryPayload) => void;
  onFatalError?: (errorMessage: LocalizedMessage) => void;
}
