import type { PopupCommand } from "../../shared/messages";
import type {
  AutoBoosterDebugState,
  RuntimeResponse,
  WorkerState
} from "../../shared/types";
import { attachTestInternals } from "./attach-test-internals";
import { createWorkerRuntime } from "./create-worker-runtime";
import { bootstrap } from "./lifecycle/bootstrap";
import { handleAlarm } from "./lifecycle/handle-alarm";
import { handleBackgroundEvent } from "./lifecycle/handle-background-event";
import { handleCaptureStatusChanged } from "./lifecycle/handle-capture-status-changed";
import { handlePopupCommand } from "./lifecycle/handle-popup-command";
import { handleTabActivated } from "./lifecycle/handle-tab-activated";
import { handleTabRemoved } from "./lifecycle/handle-tab-removed";
import { handleTabUpdated } from "./lifecycle/handle-tab-updated";
import type { WorkerRuntimeDeps, WorkerRuntimeState } from "./runtime-state";

export class WorkerOrchestrator {
  private readonly runtime: WorkerRuntimeState;

  constructor(
    offscreenClient?: WorkerRuntimeDeps["offscreenClient"],
    settingsRepository?: WorkerRuntimeDeps["settingsRepository"],
    now?: WorkerRuntimeDeps["now"],
    autoBoosterClient?: WorkerRuntimeDeps["autoBoosterClient"]
  ) {
    this.runtime = createWorkerRuntime({
      offscreenClient,
      settingsRepository,
      now,
      autoBoosterClient
    });

    if (import.meta.env.MODE === "test") {
      attachTestInternals(this, this.runtime);
    }
  }

  async bootstrap(): Promise<void> {
    await bootstrap(this.runtime);
  }

  async handlePopupCommand(
    command: PopupCommand
  ): Promise<RuntimeResponse<WorkerState | AutoBoosterDebugState | null>> {
    return handlePopupCommand(this.runtime, command);
  }

  async handleBackgroundEvent(incomingMessage: unknown, sender?: chrome.runtime.MessageSender): Promise<void> {
    await handleBackgroundEvent(this.runtime, incomingMessage, sender);
  }

  async handleAlarm(alarm: chrome.alarms.Alarm): Promise<void> {
    await handleAlarm(this.runtime, alarm);
  }

  async handleTabUpdated(
    tabId: number,
    changeInfo: { status?: string; url?: string },
    tab: chrome.tabs.Tab
  ): Promise<void> {
    await handleTabUpdated(this.runtime, tabId, changeInfo, tab);
  }

  async handleTabActivated(activeInfo: { tabId: number }): Promise<void> {
    await handleTabActivated(this.runtime, activeInfo);
  }

  async handleTabRemoved(tabId: number): Promise<void> {
    await handleTabRemoved(this.runtime, tabId);
  }

  async handleCaptureStatusChanged(info: chrome.tabCapture.CaptureInfo): Promise<void> {
    await handleCaptureStatusChanged(this.runtime, info);
  }
}
