import {
  isBridgeEventDetail,
  type BridgeStatusPayload
} from "../bridge-protocol";
import { message } from "../../shared/messages";
import type { AutoBoosterControllerInternals } from "./runtime-state";

export function handleBridgeStatusEvent(
  controller: AutoBoosterControllerInternals,
  event: Event
): void {
  const customEvent = event as CustomEvent<unknown>;

  if (!isBridgeEventDetail<BridgeStatusPayload>(customEvent.detail)) {
    return;
  }

  controller.bridgeStatus = customEvent.detail.payload;
  controller.lastAudioContextState = controller.bridgeStatus.audioContextState;
  controller.lastAutoplayPolicy = controller.bridgeStatus.autoplayPolicy;
  controller.lastTechnicalError =
    controller.bridgeStatus.lastTechnicalError ?? controller.lastTechnicalError;

  if (controller.bridgeStatus.attachState === "awaiting_user_gesture") {
    controller.state.lastError = message("errorAutoAwaitingGesture");
    controller.armGestureRetry();
  } else if (controller.bridgeStatus.attachState === "attached") {
    controller.state.lastError = undefined;
    controller.disarmGestureRetry();
  }

  controller.syncAttachState();
  controller.reportStatus();
}
