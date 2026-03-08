/**
 * @fileoverview Aggregates frame-level automatic booster runtime state into
 * the tab-level snapshot consumed by the worker, popup, and badges.
 */
import { DEFAULT_GAIN_PERCENT } from "../shared/constants";
import type {
  AutoActiveStrategy,
  AutoAttachReason,
  AutoAttachState,
  AutoBoosterDebugState,
  AutoBoosterTabState,
  AutoFrameRuntimeState,
  CaptureSessionState,
  LevelWarning,
  LocalizedMessage
} from "../shared/types";

export interface AggregatedAutoTabState extends AutoBoosterTabState {
  gainPercent: number;
  lastError?: LocalizedMessage;
}

export interface AutoTabAggregation {
  tabState: AggregatedAutoTabState;
  session: CaptureSessionState | null;
  debug: Pick<AutoBoosterDebugState, "frameCount" | "readyFrameCount" | "attachedFrameCount" | "toastVisible">;
}

/**
 * Combines all known frame-level automatic states for a tab into a single
 * product-visible snapshot.
 */
export function aggregateAutoFrameStates(
  tabId: number,
  frameStates: AutoFrameRuntimeState[],
  now: () => number
): AutoTabAggregation | null {
  if (frameStates.length === 0) {
    return null;
  }

  const preferredFrame = pickPreferredFrame(frameStates);
  const attachedFrames = frameStates.filter(
    (frame) => frame.autoAttachState === "attached" && frame.streamState === "active"
  );
  const mediaAttached = attachedFrames.some((frame) =>
    frame.autoActiveStrategy === "media_element" || frame.autoActiveStrategy === "hybrid"
  );
  const bridgeAttached = attachedFrames.some((frame) =>
    frame.autoActiveStrategy === "web_audio_bridge" || frame.autoActiveStrategy === "hybrid"
  );
  const activeStrategy: AutoActiveStrategy =
    mediaAttached && bridgeAttached
      ? "hybrid"
      : bridgeAttached
        ? "web_audio_bridge"
        : mediaAttached
          ? "media_element"
          : "none";

  const attachState = deriveAttachState(frameStates, attachedFrames.length > 0);
  const attachReason = deriveAttachReason(frameStates, attachState);
  const streamState = attachState === "attached" ? "active" : "inactive";
  const engineStatus = attachState === "failed" ? "error" : "ready";
  const telemetryFrames = attachedFrames.length > 0 ? attachedFrames : frameStates;
  const lastError = pickLastError(frameStates, attachState);
  const gainPercent = preferredFrame.gainPercent ?? DEFAULT_GAIN_PERCENT;
  const warning = pickHighestWarning(telemetryFrames.map((frame) => frame.warning));
  const level = roundTo(Math.max(...telemetryFrames.map((frame) => frame.level)), 4);
  const protectorActionDb = roundTo(
    Math.max(...telemetryFrames.map((frame) => frame.protectorActionDb)),
    2
  );
  const clipEvents = telemetryFrames.reduce((sum, frame) => sum + frame.clipEvents, 0);
  const clipPeak = roundTo(Math.max(...telemetryFrames.map((frame) => frame.clipPeak)), 4);
  const protectionBypassed = telemetryFrames.some((frame) => frame.protectionBypassed);
  const outputPeak = roundTo(Math.max(...telemetryFrames.map((frame) => frame.outputPeak)), 4);
  const tabState: AggregatedAutoTabState = {
    tabId,
    title: preferredFrame.title,
    url: preferredFrame.url,
    domain: preferredFrame.domain,
    favIconUrl: preferredFrame.favIconUrl,
    autoAttachState: attachState,
    autoAttachReason: attachReason,
    autoBoosterScope: preferredFrame.autoBoosterScope,
    autoActiveStrategy: activeStrategy,
    gainPercent,
    lastError
  };

  return {
    tabState,
    session:
      attachState === "attached"
        ? {
            tabId,
            title: preferredFrame.title,
            url: preferredFrame.url,
            domain: preferredFrame.domain,
            favIconUrl: preferredFrame.favIconUrl,
            gainPercent,
            engineLane: "auto_media_element",
            autoBoosterScope: preferredFrame.autoBoosterScope,
            autoActiveStrategy: activeStrategy,
            autoAttachState: attachState,
            autoAttachReason: attachReason,
            streamState,
            engineStatus,
            level,
            warning,
            protectorActionDb,
            clipEvents,
            clipPeak,
            protectionBypassed,
            outputPeak,
            updatedAt: now(),
            lastError
          }
        : null,
    debug: {
      frameCount: frameStates.length,
      readyFrameCount: frameStates.filter((frame) => frame.ready).length,
      attachedFrameCount: attachedFrames.length,
      toastVisible: frameStates.some((frame) => frame.toastVisible)
    }
  };
}

function pickPreferredFrame(frameStates: AutoFrameRuntimeState[]): AutoFrameRuntimeState {
  return (
    frameStates.find((frame) => frame.isTopFrame) ??
    frameStates.find((frame) => frame.autoAttachState === "attached") ??
    frameStates[0]
  );
}

function deriveAttachState(
  frameStates: AutoFrameRuntimeState[],
  hasAttachedFrames: boolean
): AutoAttachState {
  if (hasAttachedFrames) {
    return "attached";
  }

  if (frameStates.some((frame) => frame.autoAttachState === "awaiting_user_gesture")) {
    return "awaiting_user_gesture";
  }

  if (frameStates.some((frame) => frame.autoAttachState === "observing")) {
    return "observing";
  }

  if (frameStates.every((frame) => frame.autoAttachState === "unsupported")) {
    return "unsupported";
  }

  if (frameStates.some((frame) => frame.autoAttachState === "failed")) {
    return "failed";
  }

  return "observing";
}

function deriveAttachReason(
  frameStates: AutoFrameRuntimeState[],
  attachState: AutoAttachState
): AutoAttachReason | undefined {
  if (attachState === "attached") {
    return undefined;
  }

  if (attachState === "awaiting_user_gesture") {
    return "autoplay_blocked";
  }

  if (attachState === "observing") {
    return "no_media";
  }

  if (attachState === "unsupported") {
    return frameStates.find((frame) => frame.autoAttachReason === "site_not_hookable")?.autoAttachReason ??
      frameStates.find((frame) => frame.autoAttachReason)?.autoAttachReason;
  }

  return (
    frameStates.find((frame) => frame.autoAttachReason === "attach_failed")?.autoAttachReason ??
    frameStates.find((frame) => frame.autoAttachReason === "permission_missing")?.autoAttachReason ??
    frameStates.find((frame) => frame.autoAttachReason)?.autoAttachReason
  );
}

function pickLastError(
  frameStates: AutoFrameRuntimeState[],
  attachState: AutoAttachState
): LocalizedMessage | undefined {
  if (attachState === "attached") {
    return undefined;
  }

  if (attachState === "awaiting_user_gesture") {
    return (
      frameStates.find((frame) => frame.autoAttachState === "awaiting_user_gesture" && frame.lastError)?.lastError ??
      frameStates.find((frame) => frame.lastError)?.lastError
    );
  }

  if (attachState === "unsupported") {
    return (
      frameStates.find((frame) => frame.autoAttachState === "unsupported" && frame.lastError)?.lastError ??
      frameStates.find((frame) => frame.lastError)?.lastError
    );
  }

  if (attachState === "observing") {
    return (
      frameStates.find((frame) => frame.autoAttachState === "observing" && frame.lastError)?.lastError ??
      frameStates.find((frame) => frame.lastError)?.lastError
    );
  }

  return (
    frameStates.find((frame) => frame.autoAttachState === "failed" && frame.lastError)?.lastError ??
    frameStates.find((frame) => frame.lastError)?.lastError
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

function roundTo(value: number, precision: number): number {
  const factor = Math.pow(10, precision);
  return Math.round(value * factor) / factor;
}
