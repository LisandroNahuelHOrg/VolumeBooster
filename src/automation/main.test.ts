// @vitest-environment happy-dom

describe("automation main entrypoint", () => {
  beforeEach(() => {
    vi.resetModules();
    document.body.innerHTML = '<div id="app"></div>';
  });

  it("renders the automation bridge and exposes helpers on window", async () => {
    const initSentryForContext = vi.fn();
    const sendMessageSafe = vi.fn(async (command: { type: string }) => {
      if (command.type === "REQUEST_GLOBAL_PERMISSION") {
        return { ok: true, data: { autoBoosterMode: "global" } };
      }

      if (command.type === "GET_STATE") {
        return { ok: true, data: { sessions: [] } };
      }

      if (command.type === "GET_DEBUG_STATE") {
        return { ok: true, data: { attachState: "attached" } };
      }

      return { ok: true, data: { ok: true } };
    });
    const contains = vi.fn().mockResolvedValue(true);
    const queryTabs = vi
      .fn()
      .mockResolvedValueOnce([{ id: 1, url: "https://one.test", title: "One" }])
      .mockResolvedValueOnce([{ id: 2, url: "https://two.test", title: "Two" }]);

    vi.doMock("../shared/messages", () => ({
      sendMessageSafe
    }));

    vi.doMock("../shared/observability/sentry", () => ({
      initSentryForContext
    }));

    vi.stubGlobal(
      "chrome",
      {
        i18n: {
          getMessage: vi.fn(() => ""),
          getUILanguage: vi.fn(() => "en")
        },
        permissions: {
          contains
        },
        tabs: {
          query: queryTabs
        }
      } as unknown as typeof chrome
    );

    await import("./main");

    expect(initSentryForContext).toHaveBeenCalledWith("automation");
    expect(document.title).toBe("Prism Automation");
    expect(document.documentElement.lang).toBe("en");
    expect(document.documentElement.dir).toBe("ltr");
    expect(document.querySelector("[data-action='request-global-permission']")).not.toBeNull();
    expect(document.querySelector("[data-action='request-global-permission']")?.textContent).toContain(
      "Restore all-sites access"
    );
    expect(window.__PRISM_AUTOMATION__).toBeDefined();

    await expect(window.__PRISM_AUTOMATION__?.requestGlobalPermission()).resolves.toEqual({
      autoBoosterMode: "global"
    });
    await expect(window.__PRISM_AUTOMATION__?.hasGlobalPermission()).resolves.toBe(true);
    await expect(window.__PRISM_AUTOMATION__?.getState()).resolves.toEqual({ sessions: [] });
    await expect(window.__PRISM_AUTOMATION__?.getStateDetailed()).resolves.toEqual({
      ok: true,
      data: { sessions: [] }
    });
    await expect(window.__PRISM_AUTOMATION__?.getDebugState(2)).resolves.toEqual({ attachState: "attached" });
    await expect(window.__PRISM_AUTOMATION__?.getDebugStateDetailed(2)).resolves.toEqual({
      ok: true,
      data: { attachState: "attached" }
    });
    await expect(window.__PRISM_AUTOMATION__?.sendCommandDetailed({ type: "GET_STATE" })).resolves.toEqual({
      ok: true,
      data: { sessions: [] }
    });
    await expect(window.__PRISM_AUTOMATION__?.getActiveTab()).resolves.toEqual({
      id: 1,
      url: "https://one.test",
      title: "One"
    });
    await expect(window.__PRISM_AUTOMATION__?.getTabsByUrl("https://*/*")).resolves.toEqual([
      {
        id: 2,
        url: "https://two.test",
        title: "Two"
      }
    ]);

    const permissionButton = document.querySelector<HTMLButtonElement>(
      "[data-action='request-global-permission']"
    );
    permissionButton?.click();
    await Promise.resolve();
    await Promise.resolve();
    expect(document.querySelector("[data-role='output']")?.textContent).toContain('"autoBoosterMode": "global"');
  });

  it("throws when the automation root is missing", async () => {
    document.body.innerHTML = "";

    await expect(import("./main")).rejects.toThrow("Automation root not found.");
  });

  it("returns null when no active tab with numeric id exists", async () => {
    const sendMessageSafe = vi.fn(async () => ({ ok: true, data: null }));

    vi.doMock("../shared/messages", () => ({
      sendMessageSafe
    }));

    vi.doMock("../shared/observability/sentry", () => ({
      initSentryForContext: vi.fn()
    }));

    vi.stubGlobal(
      "chrome",
      {
        i18n: {
          getMessage: vi.fn(() => ""),
          getUILanguage: vi.fn(() => "en")
        },
        permissions: {
          contains: vi.fn().mockResolvedValue(false)
        },
        tabs: {
          query: vi.fn().mockResolvedValue([{}])
        }
      } as unknown as typeof chrome
    );

    await import("./main");

    await expect(window.__PRISM_AUTOMATION__?.getActiveTab()).resolves.toBeNull();
  });
});
