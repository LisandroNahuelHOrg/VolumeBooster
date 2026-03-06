import { DEFAULT_ADVANCED_AUDIO_SETTINGS } from "../shared/audio-settings";
import { AutoBoosterClient } from "./auto-booster-client";

describe("AutoBoosterClient", () => {
  const executeScript = vi.fn();
  const sendMessage = vi.fn();
  const requestPermission = vi.fn();
  const containsPermission = vi.fn();
  const queryTabs = vi.fn();
  const getUrl = vi.fn((path: string) => `chrome-extension://test/${path}`);

  beforeEach(() => {
    executeScript.mockReset();
    sendMessage.mockReset();
    requestPermission.mockReset();
    containsPermission.mockReset();
    queryTabs.mockReset();
    getUrl.mockClear();

    vi.stubGlobal(
      "chrome",
      {
        runtime: {
          getURL: getUrl
        },
        scripting: {
          executeScript
        },
        tabs: {
          sendMessage,
          query: queryTabs
        },
        permissions: {
          request: requestPermission,
          contains: containsPermission
        }
      } as unknown as typeof chrome
    );
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.useRealTimers();
  });

  it("injects the content script and configures the tab", async () => {
    const client = new AutoBoosterClient();
    sendMessage.mockResolvedValueOnce(undefined);

    await client.configure(14, {
      tabId: 14,
      scope: "global",
      enabled: true,
      suspended: false,
      gainPercent: 230,
      advancedAudioSettings: { ...DEFAULT_ADVANCED_AUDIO_SETTINGS }
    });

    expect(executeScript).toHaveBeenCalledTimes(1);
    expect(executeScript).toHaveBeenCalledWith({
      target: { tabId: 14 },
      func: expect.any(Function),
      args: ["chrome-extension://test/assets/auto-booster.js"]
    });
    expect(sendMessage).toHaveBeenCalledWith(14, {
      type: "AUTO_BOOSTER_CONFIGURE",
      payload: {
        tabId: 14,
        scope: "global",
        enabled: true,
        suspended: false,
        gainPercent: 230,
        advancedAudioSettings: { ...DEFAULT_ADVANCED_AUDIO_SETTINGS }
      }
    });
  });

  it("retries once when the content script receiver is missing", async () => {
    const client = new AutoBoosterClient();
    const setTimeoutSpy = vi.spyOn(globalThis, "setTimeout");
    sendMessage
      .mockRejectedValueOnce(new Error("Receiving end does not exist."))
      .mockResolvedValueOnce(undefined);

    await client.configure(8, {
      tabId: 8,
      scope: "global",
      enabled: true,
      suspended: false,
      gainPercent: 160,
      advancedAudioSettings: { ...DEFAULT_ADVANCED_AUDIO_SETTINGS }
    });

    expect(executeScript).toHaveBeenCalledTimes(2);
    expect(sendMessage).toHaveBeenCalledTimes(2);
    expect(setTimeoutSpy).toHaveBeenCalledWith(expect.any(Function), 50);
  });

  it("stops retrying after the allowed attempts when the receiver never appears", async () => {
    const client = new AutoBoosterClient();
    const setTimeoutSpy = vi.spyOn(globalThis, "setTimeout");

    executeScript.mockResolvedValue(undefined);
    sendMessage.mockRejectedValue(new Error("Receiving end does not exist."));

    await expect(
      (client as unknown as {
        sendMessageToTab: (tabId: number, command: Record<string, unknown>, attempts?: number) => Promise<unknown>;
      }).sendMessageToTab(
        11,
        {
          type: "AUTO_BOOSTER_DISABLE",
          payload: { tabId: 11 }
        },
        2
      )
    ).rejects.toEqual({ key: "errorAutoAttachFailed" });

    expect(sendMessage).toHaveBeenCalledTimes(2);
    expect(executeScript).toHaveBeenCalledTimes(1);
    expect(setTimeoutSpy).toHaveBeenCalledWith(expect.any(Function), 50);
  });

  it("normalizes permission errors and attach failures", async () => {
    const client = new AutoBoosterClient();
    executeScript.mockRejectedValueOnce(new Error("Cannot access contents of the page."));

    await expect(
      client.configure(3, {
        tabId: 3,
        scope: "site",
        enabled: true,
        suspended: false,
        gainPercent: 180,
        advancedAudioSettings: { ...DEFAULT_ADVANCED_AUDIO_SETTINGS }
      })
    ).rejects.toEqual({ key: "errorAutoPermissionMissing" });

    executeScript.mockResolvedValueOnce(undefined);
    sendMessage.mockRejectedValueOnce(new Error("Boom"));

    await expect(
      client.configure(3, {
        tabId: 3,
        scope: "site",
        enabled: true,
        suspended: false,
        gainPercent: 180,
        advancedAudioSettings: { ...DEFAULT_ADVANCED_AUDIO_SETTINGS }
      })
    ).rejects.toEqual({ key: "errorAutoAttachFailed" });
  });

  it("sends the disable command and swallows failures during teardown", async () => {
    const client = new AutoBoosterClient();

    sendMessage.mockResolvedValueOnce(undefined);
    await expect(client.disable(9)).resolves.toBeUndefined();
    expect(sendMessage).toHaveBeenNthCalledWith(1, 9, {
      type: "AUTO_BOOSTER_DISABLE",
      payload: { tabId: 9 }
    });

    sendMessage.mockRejectedValueOnce(new Error("Receiver missing"));
    await expect(client.disable(9)).resolves.toBeUndefined();
    expect(sendMessage).toHaveBeenNthCalledWith(2, 9, {
      type: "AUTO_BOOSTER_DISABLE",
      payload: { tabId: 9 }
    });
  });

  it("returns null debug state when injection fails", async () => {
    const client = new AutoBoosterClient();
    executeScript.mockRejectedValueOnce(new Error("Cannot access contents of the page."));
    await expect(client.getDebugState(9)).resolves.toBeNull();
  });

  it("queries permissions, tabs and debug state through chrome APIs", async () => {
    const client = new AutoBoosterClient();
    requestPermission.mockResolvedValueOnce(true);
    containsPermission.mockResolvedValueOnce(true);
    queryTabs.mockResolvedValueOnce([{ id: 1 }, { id: 2 }]);
    executeScript.mockResolvedValueOnce(undefined);
    sendMessage.mockResolvedValueOnce({ attachState: "attached" });

    await expect(client.requestGlobalPermission()).resolves.toBe(true);
    await expect(client.hasGlobalPermission()).resolves.toBe(true);
    await expect(client.queryInjectableTabs()).resolves.toEqual([{ id: 1 }, { id: 2 }]);
    await expect(client.getDebugState(21)).resolves.toEqual({ attachState: "attached" });

    expect(requestPermission).toHaveBeenCalledWith({
      origins: ["<all_urls>"]
    });
    expect(containsPermission).toHaveBeenCalledWith({
      origins: ["<all_urls>"]
    });
    expect(queryTabs).toHaveBeenCalledWith({
      url: ["http://*/*", "https://*/*"]
    });
    expect(sendMessage).toHaveBeenCalledWith(21, {
      type: "AUTO_BOOSTER_GET_DEBUG_STATE"
    });
  });

  it("loads and caches the injected content module inside the page runtime", async () => {
    const client = new AutoBoosterClient();
    sendMessage.mockResolvedValueOnce(undefined);

    await client.configure(14, {
      tabId: 14,
      scope: "global",
      enabled: true,
      suspended: false,
      gainPercent: 230,
      advancedAudioSettings: { ...DEFAULT_ADVANCED_AUDIO_SETTINGS }
    });

    const [{ func, args }] = executeScript.mock.calls[0] as Array<{
      func: (moduleUrl: string) => Promise<void>;
      args: string[];
    }>;
    const runtimeWindow = {} as Window & {
      __PRISM_AUTO_BOOSTER_IMPORT_PROMISE__?: Promise<unknown>;
    };
    vi.stubGlobal("window", runtimeWindow);
    const moduleUrl = "data:text/javascript,export default 1";

    await func(moduleUrl);
    const cachedPromise = runtimeWindow.__PRISM_AUTO_BOOSTER_IMPORT_PROMISE__;
    await func(moduleUrl);

    expect(cachedPromise).toBeInstanceOf(Promise);
    expect(args[0]).toContain("assets/auto-booster.js");
    expect(runtimeWindow.__PRISM_AUTO_BOOSTER_IMPORT_PROMISE__).toBe(cachedPromise);
  });
});
