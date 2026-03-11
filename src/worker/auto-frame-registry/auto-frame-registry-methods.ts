import type { AutoFrameRuntimeState, AutoFrameTarget } from "../../shared/types";
import type { KnownAutoFrame, UpsertKnownFrameInput } from "./known-auto-frame";

export interface AutoFrameRegistryMethods {
  upsertKnownFrame(frame: UpsertKnownFrameInput): KnownAutoFrame;
  updateFrameState(state: AutoFrameRuntimeState): void;
  getKnownFrames(tabId: number): KnownAutoFrame[];
  getTopFrame(tabId: number): KnownAutoFrame | null;
  getFrameStates(tabId: number): AutoFrameRuntimeState[];
  getFrameState(tabId: number, target: AutoFrameTarget): AutoFrameRuntimeState | null;
  removeFrame(tabId: number, target: AutoFrameTarget): void;
  clearTab(tabId: number): void;
  markToastVisible(tabId: number, target: AutoFrameTarget, visible: boolean): void;
  markToastDismissed(tabId: number, target: AutoFrameTarget, dismissed: boolean): void;
  isToastDismissed(tabId: number, target: AutoFrameTarget): boolean;
  resetToastStateForTab(tabId: number): void;
}
