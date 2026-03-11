import { SettingsRepository } from "../../shared/storage";
import type {
  AutoSessionAttachFailedPayload,
  AutoSessionLevelPayload,
  AutoSessionStatusPayload,
  CaptureSessionState
} from "../../shared/types";
import { createWorkerRuntime } from "./create-worker-runtime";

export function createMemoryStorage() {
  const store: Record<string, unknown> = {};

  return {
    area: {
      async get(key?: string | string[] | null) {
        if (!key) {
          return { ...store };
        }

        if (typeof key === "string") {
          return { [key]: store[key] };
        }

        return key.reduce<Record<string, unknown>>((accumulator, currentKey) => {
          accumulator[currentKey] = store[currentKey];
          return accumulator;
        }, {});
      },
      async set(items: Record<string, unknown>) {
        Object.assign(store, items);
      }
    }
  };
}

export function makeSession(
  tabId: number,
  domain: string,
  gainPercent: number,
  overrides: Partial<CaptureSessionState> = {}
): CaptureSessionState {
  return {
    tabId,
    title: `Tab ${tabId}`,
    url: `https://${domain}/video`,
    domain,
    favIconUrl: `https://${domain}/favicon.ico`,
    gainPercent,
    engineLane: "manual_tab_capture",
    autoAttachState: "idle",
    streamState: "active",
    engineStatus: "ready",
    level: 0.3,
    warning: "none",
    protectorActionDb: 4.1,
    clipEvents: 0,
    clipPeak: 0,
    protectionBypassed: false,
    outputPeak: 0.52,
    updatedAt: 1,
    ...overrides
  };
}

export function makeAutoStatus(overrides: Partial<AutoSessionStatusPayload> = {}): AutoSessionStatusPayload {
  return {
    tabId: 7,
    title: "YouTube",
    url: "https://youtube.com/watch?v=1",
    domain: "youtube.com",
    favIconUrl: "https://youtube.com/favicon.ico",
    autoAttachState: "attached",
    autoAttachReason: undefined,
    autoBoosterScope: "global",
    gainPercent: 220,
    engineLane: "auto_media_element",
    streamState: "active",
    engineStatus: "ready",
    ...overrides
  };
}

export function makeLevelUpdate(overrides: Partial<AutoSessionLevelPayload> = {}): AutoSessionLevelPayload {
  return {
    tabId: 7,
    level: 0.45,
    warning: "high",
    protectorActionDb: 7.5,
    clipEvents: 2,
    clipPeak: 1.1,
    protectionBypassed: false,
    outputPeak: 0.78,
    ...overrides
  };
}

export function makeAttachFailure(
  overrides: Partial<AutoSessionAttachFailedPayload> = {}
): AutoSessionAttachFailedPayload {
  return {
    ...makeAutoStatus({
      autoAttachState: "failed",
      autoAttachReason: "attach_failed",
      ...overrides
    }),
    engineLane: "auto_media_element",
    streamState: "inactive",
    engineStatus: "ready"
  };
}

export function createTestRuntime(now = 1) {
  const storage = new SettingsRepository(createMemoryStorage().area);
  const offscreenClient = {
    getSnapshot: vi.fn(async () => [] as CaptureSessionState[]),
    startSession: vi.fn(async () => [] as CaptureSessionState[]),
    setGain: vi.fn(async () => [] as CaptureSessionState[]),
    setAdvancedAudioSettings: vi.fn(async () => [] as CaptureSessionState[]),
    stopSession: vi.fn(async () => [] as CaptureSessionState[]),
    stopAll: vi.fn(async () => [] as CaptureSessionState[]),
    updateMetadata: vi.fn(async () => [] as CaptureSessionState[]),
    closeIfIdle: vi.fn(async () => undefined)
  };
  const autoBoosterClient = {
    requestGlobalPermission: vi.fn(async () => true),
    hasGlobalPermission: vi.fn(async () => true),
    queryInjectableTabs: vi.fn(async () => [] as chrome.tabs.Tab[]),
    injectRegisteredScriptsIntoTab: vi.fn(async () => undefined),
    configure: vi.fn(async () => undefined),
    disable: vi.fn(async () => undefined),
    getDebugState: vi.fn(async () => null),
    sendMessageToFrame: vi.fn(async () => undefined),
    registerGlobalContentScripts: vi.fn(async () => undefined),
    unregisterGlobalContentScripts: vi.fn(async () => undefined)
  };

  const runtime = createWorkerRuntime({
    offscreenClient: offscreenClient as never,
    settingsRepository: storage,
    now: () => now,
    autoBoosterClient: autoBoosterClient as never
  });

  return {
    runtime,
    storage,
    offscreenClient,
    autoBoosterClient
  };
}
