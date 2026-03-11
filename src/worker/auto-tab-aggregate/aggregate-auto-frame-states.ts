import { DEFAULT_GAIN_PERCENT } from "../../shared/constants";
import type { AutoFrameRuntimeState } from "../../shared/types";
import type { AutoTabAggregation } from "./auto-tab-aggregation-contract";
import { buildAggregatedAutoSession } from "./build-aggregated-auto-session";
import { buildAggregatedAutoTabState } from "./build-aggregated-auto-tab-state";
import { buildAutoDebugStateSnapshot } from "./build-auto-debug-state-snapshot";
import { calculateAggregatedAutoTelemetry } from "./calculate-aggregated-auto-telemetry";
import { collectAttachedAutoFrames } from "./collect-attached-auto-frames";
import { deriveAutoActiveStrategy } from "./derive-auto-active-strategy";
import { deriveAutoAttachReason } from "./derive-auto-attach-reason";
import { deriveAutoAttachState } from "./derive-auto-attach-state";
import { pickAutoLastError } from "./pick-auto-last-error";
import { pickPreferredAutoFrame } from "./pick-preferred-auto-frame";
import { selectAutoTelemetryFrames } from "./select-auto-telemetry-frames";

export function aggregateAutoFrameStates(
  tabId: number,
  frameStates: AutoFrameRuntimeState[],
  now: () => number
): AutoTabAggregation | null {
  if (frameStates.length === 0) {
    return null;
  }

  const preferredFrame = pickPreferredAutoFrame(frameStates);
  const attachedFrames = collectAttachedAutoFrames(frameStates);
  const activeStrategy = deriveAutoActiveStrategy(attachedFrames);
  const attachState = deriveAutoAttachState(frameStates, attachedFrames.length > 0);
  const attachReason = deriveAutoAttachReason(frameStates, attachState);
  const lastError = pickAutoLastError(frameStates, attachState);
  const gainPercent = preferredFrame.gainPercent ?? DEFAULT_GAIN_PERCENT;
  const telemetryFrames = selectAutoTelemetryFrames(frameStates, attachedFrames);
  const telemetry = calculateAggregatedAutoTelemetry(telemetryFrames);

  return {
    tabState: buildAggregatedAutoTabState({
      tabId,
      preferredFrame,
      attachState,
      attachReason,
      activeStrategy,
      gainPercent,
      lastError
    }),
    session: buildAggregatedAutoSession({
      tabId,
      preferredFrame,
      attachState,
      attachReason,
      activeStrategy,
      gainPercent,
      telemetry,
      now,
      lastError
    }),
    debug: buildAutoDebugStateSnapshot(frameStates, attachedFrames)
  };
}
