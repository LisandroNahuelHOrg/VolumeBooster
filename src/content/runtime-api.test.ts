// @vitest-environment happy-dom

import {
  addRuntimeMessageListenerSafe,
  getI18nMessageSafe,
  getRuntimeUrlSafe,
  sendRuntimeMessageSafe
} from "./runtime-api";

describe("runtime-api", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("returns runtime results and swallows runtime failures", async () => {
    const sendMessage = vi
      .fn()
      .mockResolvedValueOnce({ ok: true })
      .mockRejectedValueOnce(new Error("stale context"));

    vi.stubGlobal(
      "chrome",
      {
        runtime: {
          sendMessage
        }
      } as unknown as typeof chrome
    );

    await expect(sendRuntimeMessageSafe("first")).resolves.toEqual({ ok: true });
    await expect(sendRuntimeMessageSafe("second")).resolves.toBeUndefined();
  });

  it("adds runtime listeners safely and handles invalidated contexts", () => {
    const addListener = vi.fn();

    vi.stubGlobal(
      "chrome",
      {
        runtime: {
          onMessage: {
            addListener
          }
        }
      } as unknown as typeof chrome
    );

    const listener = vi.fn();

    expect(addRuntimeMessageListenerSafe(listener)).toBe(true);
    expect(addListener).toHaveBeenCalledWith(listener);

    addListener.mockImplementationOnce(() => {
      throw new Error("extension reloaded");
    });

    expect(addRuntimeMessageListenerSafe(listener)).toBe(false);
  });

  it("reads i18n messages safely and falls back to the generated English catalog", () => {
    const getMessage = vi
      .fn()
      .mockReturnValueOnce("Boost")
      .mockReturnValueOnce(undefined)
      .mockImplementationOnce(() => {
        throw new Error("stale");
      });

    vi.stubGlobal(
      "chrome",
      {
        i18n: {
          getMessage
        }
      } as unknown as typeof chrome
    );

    expect(getI18nMessageSafe("boostLabel", ["250"])).toBe("Boost");
    expect(getI18nMessageSafe("boostLabel")).toBe("Boost");
    expect(getI18nMessageSafe("automationRestoreAllSitesAccess")).toBe("Restore all-sites access");
  });

  it("falls back cleanly when chrome.i18n or getMessage are missing", () => {
    vi.stubGlobal("chrome", { i18n: {} } as unknown as typeof chrome);
    expect(getI18nMessageSafe("automationRestoreAllSitesAccess")).toBe("Restore all-sites access");

    vi.stubGlobal("chrome", {} as typeof chrome);
    expect(getI18nMessageSafe("automationRestoreAllSitesAccess")).toBe("Restore all-sites access");
  });

  it("reads extension URLs safely and returns null on stale contexts", () => {
    const getURL = vi
      .fn()
      .mockReturnValueOnce("chrome-extension://id/offscreen.html")
      .mockImplementationOnce(() => {
        throw new Error("stale");
      });

    vi.stubGlobal(
      "chrome",
      {
        runtime: {
          getURL
        }
      } as unknown as typeof chrome
    );

    expect(getRuntimeUrlSafe("offscreen.html")).toBe("chrome-extension://id/offscreen.html");
    expect(getRuntimeUrlSafe("popup.html")).toBeNull();
  });
});
