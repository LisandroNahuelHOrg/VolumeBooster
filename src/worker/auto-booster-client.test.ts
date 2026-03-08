import { DEFAULT_ADVANCED_AUDIO_SETTINGS } from "../shared/audio-settings";
import { AutoBoosterClient } from "./auto-booster-client";

describe("AutoBoosterClient", () => {
  const executeScript = vi.fn();
  const registerContentScripts = vi.fn();
  const sendMessage = vi.fn();
  const requestPermission = vi.fn();
  const containsPermission = vi.fn();
  const queryTabs = vi.fn();
  const unregisterContentScripts = vi.fn();

  beforeEach(() => {
    executeScript.mockReset();
    registerContentScripts.mockReset();
    sendMessage.mockReset();
    requestPermission.mockReset();
    containsPermission.mockReset();
    queryTabs.mockReset();
    unregisterContentScripts.mockReset();

    vi.stubGlobal(
      "chrome",
      {
        scripting: {
          executeScript,
          registerContentScripts,
          unregisterContentScripts
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

    expect(executeScript).toHaveBeenCalledTimes(2);
    expect(executeScript).toHaveBeenNthCalledWith(1, {
      target: { tabId: 14, allFrames: true },
      files: ["content-scripts/auto-booster-isolated.js"]
    });
    expect(executeScript).toHaveBeenNthCalledWith(2, {
      target: { tabId: 14, allFrames: true },
      files: ["content-scripts/auto-booster-main.js"],
      world: "MAIN"
    });
    expect(sendMessage).toHaveBeenNthCalledWith(1, 14, {
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

    expect(executeScript).toHaveBeenCalledTimes(4);
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
    expect(executeScript).toHaveBeenCalledTimes(2);
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

  it("registers and unregisters the global content scripts for isolated and main worlds", async () => {
    const client = new AutoBoosterClient();

    await client.registerGlobalContentScripts();
    await client.unregisterGlobalContentScripts();

    expect(unregisterContentScripts).toHaveBeenNthCalledWith(1, {
      ids: ["prism-auto-booster-isolated", "prism-auto-booster-main"]
    });
    expect(registerContentScripts).toHaveBeenCalledWith([
      {
        id: "prism-auto-booster-isolated",
        js: ["content-scripts/auto-booster-isolated.js"],
        matches: ["http://*/*", "https://*/*"],
        allFrames: true,
        matchOriginAsFallback: true,
        persistAcrossSessions: true,
        runAt: "document_start",
        world: "ISOLATED"
      },
      {
        id: "prism-auto-booster-main",
        js: ["content-scripts/auto-booster-main.js"],
        matches: ["http://*/*", "https://*/*"],
        allFrames: true,
        matchOriginAsFallback: true,
        persistAcrossSessions: true,
        runAt: "document_start",
        world: "MAIN"
      }
    ]);
    expect(unregisterContentScripts).toHaveBeenNthCalledWith(2, {
      ids: ["prism-auto-booster-isolated", "prism-auto-booster-main"]
    });
    expect(executeScript).not.toHaveBeenCalled();
    expect(sendMessage).not.toHaveBeenCalled();
  });
});
