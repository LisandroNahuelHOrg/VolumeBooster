import type {
  AutoBoosterConfigPayload,
  AutoBoosterDebugState,
  AutoFrameTarget
} from "../../shared/types";
import type { ContentCommand } from "../../shared/messages";

export interface AutoBoosterClient {
  configure(tabId: number, payload: AutoBoosterConfigPayload, target?: AutoFrameTarget): Promise<void>;
  disable(tabId: number, target?: AutoFrameTarget): Promise<void>;
  getDebugState(tabId: number, target?: AutoFrameTarget): Promise<AutoBoosterDebugState | null>;
  sendMessageToFrame<T = void>(tabId: number, target: AutoFrameTarget, command: ContentCommand): Promise<T | undefined>;
  requestGlobalPermission(): Promise<boolean>;
  hasGlobalPermission(): Promise<boolean>;
  queryInjectableTabs(): Promise<chrome.tabs.Tab[]>;
  registerGlobalContentScripts(): Promise<void>;
  unregisterGlobalContentScripts(): Promise<void>;
  injectRegisteredScriptsIntoTab(tabId: number): Promise<void>;
}
