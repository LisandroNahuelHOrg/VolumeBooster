import { SettingsRepository } from "../../../../shared/storage";
import type { CaptureSessionState } from "../../../../shared/types";
import { createWorkerRuntime } from "../../create-worker-runtime";
import { createMemoryStorage } from "./create-memory-storage";
import { getFixedNow } from "./get-fixed-now";

export function createTestRuntime(now = 1) {
  const storage = new SettingsRepository(createMemoryStorage().area);
  const offscreenClient = {
    getSnapshot: vi.fn().mockResolvedValue([] as CaptureSessionState[]),
    startSession: vi.fn().mockResolvedValue([] as CaptureSessionState[]),
    setGain: vi.fn().mockResolvedValue([] as CaptureSessionState[]),
    setAdvancedAudioSettings: vi.fn().mockResolvedValue([] as CaptureSessionState[]),
    stopSession: vi.fn().mockResolvedValue([] as CaptureSessionState[]),
    stopAll: vi.fn().mockResolvedValue([] as CaptureSessionState[]),
    updateMetadata: vi.fn().mockResolvedValue([] as CaptureSessionState[]),
    closeIfIdle: vi.fn().mockResolvedValue(undefined)
  };
  const autoBoosterClient = {
    requestGlobalPermission: vi.fn().mockResolvedValue(true),
    hasGlobalPermission: vi.fn().mockResolvedValue(true),
    queryInjectableTabs: vi.fn().mockResolvedValue([] as chrome.tabs.Tab[]),
    injectRegisteredScriptsIntoTab: vi.fn().mockResolvedValue(undefined),
    configure: vi.fn().mockResolvedValue(undefined),
    disable: vi.fn().mockResolvedValue(undefined),
    getDebugState: vi.fn().mockResolvedValue(null),
    sendMessageToFrame: vi.fn().mockResolvedValue(undefined),
    registerGlobalContentScripts: vi.fn().mockResolvedValue(undefined),
    unregisterGlobalContentScripts: vi.fn().mockResolvedValue(undefined)
  };
  const runtime = createWorkerRuntime({
    offscreenClient: offscreenClient as never,
    settingsRepository: storage,
    now: getFixedNow.bind(undefined, now) as () => number,
    autoBoosterClient: autoBoosterClient as never
  });

  return {
    runtime,
    storage,
    offscreenClient,
    autoBoosterClient
  };
}
