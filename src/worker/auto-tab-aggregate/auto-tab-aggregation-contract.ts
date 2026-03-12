import type {
  AutoBoosterDebugState,
  AutoBoosterTabState,
  CaptureSessionState,
  LocalizedMessage
} from "../../shared/types";

export interface AggregatedAutoTabState extends AutoBoosterTabState {
  gainPercent: number;
  lastError?: LocalizedMessage;
}

export type AutoDebugStateSnapshot = Pick<
  AutoBoosterDebugState,
  "frameCount" | "readyFrameCount" | "attachedFrameCount" | "toastVisible"
>;

export interface AutoTabAggregation {
  tabState: AggregatedAutoTabState;
  session: CaptureSessionState | null;
  debug: AutoDebugStateSnapshot;
}
