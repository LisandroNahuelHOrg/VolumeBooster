import type {
  AutoBoosterConfigPayload,
  AutoBoosterDebugState
} from "../../shared/types";
import { getCurrentFrameContext } from "../frame-runtime";
import { sendRuntimeMessageSafe } from "../runtime-api";
import { armGestureRetry } from "./arm-gesture-retry";
import { clearAllPendingMediaRetryListeners } from "./clear-all-pending-media-retry-listeners";
import { clearPendingMediaRetryListeners } from "./clear-pending-media-retry-listeners";
import { configureController } from "./configure-controller";
import { createControllerRuntime } from "./create-controller-runtime";
import { destroyController } from "./destroy-controller";
import { disableController } from "./disable-controller";
import { disarmGestureRetry } from "./disarm-gesture-retry";
import { ensureBridgeListeners } from "./ensure-bridge-listeners";
import { ensureObserver } from "./ensure-observer";
import { ensurePendingMediaRetryListeners } from "./ensure-pending-media-retry-listeners";
import { getDebugState } from "./get-debug-state";
import { handleBridgeStatusEvent } from "./handle-bridge-status-event";
import { handleBridgeTelemetryEvent } from "./handle-bridge-telemetry-event";
import { handleDomMutation } from "./handle-dom-mutation";
import { handleGestureRetry } from "./handle-gesture-retry";
import { postBridgeCommand } from "./post-bridge-command";
import { publishTelemetry } from "./publish-telemetry";
import { pruneDetachedSessions } from "./prune-detached-sessions";
import { refreshMediaTracking } from "./refresh-media-tracking";
import type {
  AutoBoosterControllerInternals,
  ControllerRuntimeFields
} from "./runtime-state";
import { runRefreshMediaTracking } from "./run-refresh-media-tracking";
import { scanForMediaElements } from "./scan-for-media-elements";
import { setProcessingEnabled } from "./set-processing-enabled";
import { startTelemetryLoop } from "./start-telemetry-loop";
import { stopTelemetryLoop } from "./stop-telemetry-loop";
import { reportAttachFailure } from "./report-attach-failure";
import { reportStatus } from "./report-status";
import { syncAttachState } from "./sync-attach-state";
import { syncLocationState } from "./sync-location-state";
import { syncTrackedSessionsConfiguration } from "./sync-tracked-sessions-configuration";

export class AutoBoosterController {
  declare frameContext: ControllerRuntimeFields["frameContext"]; declare trackedSessions: ControllerRuntimeFields["trackedSessions"];
  declare processedElements: ControllerRuntimeFields["processedElements"]; declare pendingMediaRetryControllers: ControllerRuntimeFields["pendingMediaRetryControllers"];
  declare historyCheckTimer: ControllerRuntimeFields["historyCheckTimer"]; declare telemetryTimer: ControllerRuntimeFields["telemetryTimer"];
  declare observer: ControllerRuntimeFields["observer"]; declare gestureRetryAbortController: ControllerRuntimeFields["gestureRetryAbortController"];
  declare bridgeStatus: ControllerRuntimeFields["bridgeStatus"]; declare bridgeTelemetry: ControllerRuntimeFields["bridgeTelemetry"];
  declare state: ControllerRuntimeFields["state"]; declare lastLocationHref: ControllerRuntimeFields["lastLocationHref"];
  declare lastTelemetryAt: ControllerRuntimeFields["lastTelemetryAt"]; declare lastLevel: ControllerRuntimeFields["lastLevel"];
  declare lastAudioContextState: ControllerRuntimeFields["lastAudioContextState"]; declare lastAutoplayPolicy: ControllerRuntimeFields["lastAutoplayPolicy"];
  declare lastTechnicalError: ControllerRuntimeFields["lastTechnicalError"]; declare refreshInFlight: ControllerRuntimeFields["refreshInFlight"];
  declare refreshQueued: ControllerRuntimeFields["refreshQueued"]; declare bridgeListenersBound: ControllerRuntimeFields["bridgeListenersBound"];
  declare lastAutoRetryAt: ControllerRuntimeFields["lastAutoRetryAt"];

  readonly handleBridgeStatusEvent = (event: Event): void => handleBridgeStatusEvent(this as unknown as AutoBoosterControllerInternals, event);
  readonly handleBridgeTelemetryEvent = (event: Event): void => handleBridgeTelemetryEvent(this as unknown as AutoBoosterControllerInternals, event);

  constructor() {
    Object.assign(this, createControllerRuntime(getCurrentFrameContext(), () => {
      this.syncLocationState();
    }));
  }

  async configure(payload: AutoBoosterConfigPayload): Promise<void> { return configureController(this as unknown as AutoBoosterControllerInternals, payload); }
  async disable(tabId: number): Promise<void> { return disableController(this as unknown as AutoBoosterControllerInternals, tabId); }
  async destroy(): Promise<void> { return destroyController(this as unknown as AutoBoosterControllerInternals); }
  getDebugState(toastVisible = false): AutoBoosterDebugState { return getDebugState(this as unknown as AutoBoosterControllerInternals, toastVisible); }

  private ensureObserver(): void { return ensureObserver(this as unknown as AutoBoosterControllerInternals); }
  private async handleDomMutation(): Promise<void> { return handleDomMutation(this as unknown as AutoBoosterControllerInternals); }
  private async refreshMediaTracking(): Promise<void> { return refreshMediaTracking(this as unknown as AutoBoosterControllerInternals); }
  private async runRefreshMediaTracking(): Promise<void> { return runRefreshMediaTracking(this as unknown as AutoBoosterControllerInternals); }
  private async scanForMediaElements(): Promise<void> { return scanForMediaElements(this as unknown as AutoBoosterControllerInternals); }
  private pruneDetachedSessions(): void { return pruneDetachedSessions(this as unknown as AutoBoosterControllerInternals); }
  private syncTrackedSessionsConfiguration(): void { return syncTrackedSessionsConfiguration(this as unknown as AutoBoosterControllerInternals); }
  private setProcessingEnabled(enabled: boolean): void { return setProcessingEnabled(this as unknown as AutoBoosterControllerInternals, enabled); }
  private startTelemetryLoop(): void { return startTelemetryLoop(this as unknown as AutoBoosterControllerInternals); }
  private stopTelemetryLoop(): void { return stopTelemetryLoop(this as unknown as AutoBoosterControllerInternals); }
  private publishTelemetry(): void { return publishTelemetry(this as unknown as AutoBoosterControllerInternals); }
  private syncAttachState(): void { return syncAttachState(this as unknown as AutoBoosterControllerInternals); }
  private reportStatus(): void { return reportStatus(this as unknown as AutoBoosterControllerInternals); }
  private reportAttachFailure(): void { return reportAttachFailure(this as unknown as AutoBoosterControllerInternals); }
  private syncLocationState(): void { return syncLocationState(this as unknown as AutoBoosterControllerInternals); }
  private armGestureRetry(): void { return armGestureRetry(this as unknown as AutoBoosterControllerInternals); }
  private disarmGestureRetry(): void { return disarmGestureRetry(this as unknown as AutoBoosterControllerInternals); }
  private async handleGestureRetry(): Promise<void> { return handleGestureRetry(this as unknown as AutoBoosterControllerInternals); }
  private ensurePendingMediaRetryListeners(mediaElement: HTMLMediaElement): void { return ensurePendingMediaRetryListeners(this as unknown as AutoBoosterControllerInternals, mediaElement); }
  private clearPendingMediaRetryListeners(mediaElement: HTMLMediaElement): void { return clearPendingMediaRetryListeners(this as unknown as AutoBoosterControllerInternals, mediaElement); }
  private clearAllPendingMediaRetryListeners(): void { return clearAllPendingMediaRetryListeners(this as unknown as AutoBoosterControllerInternals); }
  private postBridgeCommand(payload: Parameters<typeof postBridgeCommand>[1]): void { return postBridgeCommand(this as unknown as AutoBoosterControllerInternals, payload); }
  private ensureBridgeListeners(): void { return ensureBridgeListeners(this as unknown as AutoBoosterControllerInternals); }
  private async postRuntimeMessage(message: unknown): Promise<void> { await sendRuntimeMessageSafe(message); }
  private canDispatchBridgeEvents(): boolean { return typeof window.dispatchEvent === "function" && typeof CustomEvent === "function"; }
  private canBindBridgeListeners(): boolean { return typeof window.addEventListener === "function"; }
  private canRemoveBridgeListeners(): boolean { return typeof window.removeEventListener === "function"; }
}
