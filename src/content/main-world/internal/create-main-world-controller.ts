import { applyMainWorldBypassState } from "./controller/apply-main-world-bypass-state";
import { applyMainWorldRuntimeParameters } from "./controller/apply-main-world-runtime-parameters";
import { attachMainWorldExternalNode } from "./controller/attach-main-world-external-node";
import { bootstrapMainWorldController } from "./controller/bootstrap-main-world-controller";
import { buildMainWorldStatusPayload } from "./controller/build-main-world-status-payload";
import { configureMainWorldController } from "./controller/configure-main-world-controller";
import { createHandleBridgeCommand } from "./controller/create-handle-bridge-command";
import { createHandlePatchedConnect } from "./controller/create-handle-patched-connect";
import { createHandlePatchedDisconnect } from "./controller/create-handle-patched-disconnect";
import { createPatchedAudioContext } from "./controller/create-patched-audio-context";
import { detachMainWorldExternalNode } from "./controller/detach-main-world-external-node";
import { disableMainWorldController } from "./controller/disable-main-world-controller";
import { patchMainWorldAudioNodePrototype } from "./controller/patch-main-world-audio-node-prototype";
import { patchMainWorldConstructors } from "./controller/patch-main-world-constructors";
import { publishMainWorldTelemetry } from "./controller/publish-main-world-telemetry";
import { registerMainWorldContext } from "./controller/register-main-world-context";
import { reportMainWorldStatus } from "./controller/report-main-world-status";
import { resolveMainWorldBridgeStateForNode } from "./controller/resolve-main-world-bridge-state-for-node";
import { syncMainWorldTelemetryLoop } from "./controller/sync-main-world-telemetry-loop";
import type { BridgeContextState, MainWorldController } from "./main-world-runtime-state";

export function createMainWorldController(): MainWorldController {
  const controller = {} as MainWorldController;
  controller.bridgeStates = new WeakMap<AudioContext, BridgeContextState>();
  controller.bridgeStateList = [];
  controller.nodeBridgeMembership = new WeakMap<AudioNode, Set<number>>();
  controller.contextIds = new WeakMap<AudioContext, number>();
  controller.originalConnect = AudioNode.prototype.connect;
  controller.originalDisconnect = AudioNode.prototype.disconnect;
  controller.telemetryTimer = null;
  controller.nextContextId = 1;
  controller.lastTechnicalError = undefined;
  controller.state = { enabled: false, suspended: false, scope: null, gainPercent: 100, advancedAudioSettings: null };
  controller.bootstrap = bootstrapMainWorldController.bind(undefined, controller);
  controller.configure = configureMainWorldController.bind(undefined, controller);
  controller.disable = disableMainWorldController.bind(undefined, controller);
  controller.patchConstructors = patchMainWorldConstructors.bind(undefined, controller);
  controller.patchAudioNodePrototype = patchMainWorldAudioNodePrototype.bind(undefined, controller);
  controller.registerContext = registerMainWorldContext.bind(undefined, controller);
  controller.resolveBridgeStateForNode = resolveMainWorldBridgeStateForNode.bind(undefined, controller);
  controller.attachExternalNode = attachMainWorldExternalNode.bind(undefined, controller);
  controller.detachExternalNode = detachMainWorldExternalNode.bind(undefined, controller);
  controller.applyRuntimeParameters = applyMainWorldRuntimeParameters.bind(undefined, controller);
  controller.applyBypassState = applyMainWorldBypassState;
  controller.syncTelemetryLoop = syncMainWorldTelemetryLoop.bind(undefined, controller);
  controller.publishTelemetry = publishMainWorldTelemetry.bind(undefined, controller);
  controller.buildStatusPayload = buildMainWorldStatusPayload.bind(undefined, controller);
  controller.reportStatus = reportMainWorldStatus.bind(undefined, controller);
  controller.handleBridgeCommand = createHandleBridgeCommand(controller);
  controller.handlePatchedConnect = createHandlePatchedConnect(controller);
  controller.handlePatchedDisconnect = createHandlePatchedDisconnect(controller);
  controller.PatchedAudioContext = createPatchedAudioContext(controller, window.AudioContext);
  controller.PatchedWebkitAudioContext = window.webkitAudioContext
    ? createPatchedAudioContext(controller, window.webkitAudioContext)
    : undefined;
  return controller;
}
