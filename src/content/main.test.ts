// @vitest-environment happy-dom

describe("content main entrypoint", () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it("boots the controller once, routes content commands and destroys on unload", async () => {
    const configure = vi.fn().mockResolvedValue(undefined);
    const disable = vi.fn().mockResolvedValue(undefined);
    const destroy = vi.fn().mockResolvedValue(undefined);
    const getDebugState = vi.fn().mockReturnValue({ attachState: "attached" });
    const onMessageAddListener = vi.fn();
    const addEventListener = vi.fn();

    vi.doMock("./controller", () => ({
      AutoBoosterController: class {
        configure = configure;
        disable = disable;
        destroy = destroy;
        getDebugState = getDebugState;
      }
    }));

    vi.doMock("../shared/messages", () => ({
      isContentCommand: vi.fn((message: { type?: string }) => String(message.type).startsWith("AUTO_BOOSTER_"))
    }));

    vi.stubGlobal(
      "window",
      {
        addEventListener
      } as unknown as Window & typeof globalThis
    );
    vi.stubGlobal(
      "chrome",
      {
        runtime: {
          onMessage: {
            addListener: onMessageAddListener
          }
        }
      } as unknown as typeof chrome
    );

    await import("./main");

    expect(onMessageAddListener).toHaveBeenCalledTimes(1);
    expect(addEventListener).toHaveBeenCalledWith("beforeunload", expect.any(Function));

    const runtimeListener = onMessageAddListener.mock.calls[0][0] as (
      message: unknown,
      sender: unknown,
      sendResponse: (value: unknown) => void
    ) => boolean;
    const sendResponse = vi.fn();

    expect(
      runtimeListener(
        {
          type: "AUTO_BOOSTER_CONFIGURE",
          payload: { tabId: 1, scope: "global", enabled: true, suspended: false, gainPercent: 150, advancedAudioSettings: {} }
        },
        {},
        sendResponse
      )
    ).toBe(true);
    await Promise.resolve();
    expect(configure).toHaveBeenCalled();

    expect(
      runtimeListener(
        {
          type: "AUTO_BOOSTER_DISABLE",
          payload: { tabId: 7 }
        },
        {},
        sendResponse
      )
    ).toBe(true);
    await Promise.resolve();
    expect(disable).toHaveBeenCalledWith(7);

    expect(runtimeListener({ type: "AUTO_BOOSTER_GET_DEBUG_STATE" }, {}, sendResponse)).toBe(true);
    await Promise.resolve();
    expect(sendResponse).toHaveBeenLastCalledWith({ attachState: "attached" });

    expect(runtimeListener({ type: "GET_STATE" }, {}, sendResponse)).toBe(false);

    const beforeUnloadListener = addEventListener.mock.calls[0][1] as () => void;
    beforeUnloadListener();
    await Promise.resolve();
    expect(destroy).toHaveBeenCalled();
  });

  it("swallows command failures and answers with undefined", async () => {
    const configure = vi.fn().mockRejectedValue(new Error("blocked"));
    const disable = vi.fn().mockResolvedValue(undefined);
    const destroy = vi.fn().mockResolvedValue(undefined);
    const getDebugState = vi.fn().mockReturnValue({ attachState: "attached" });
    const onMessageAddListener = vi.fn();

    vi.doMock("./controller", () => ({
      AutoBoosterController: class {
        configure = configure;
        disable = disable;
        destroy = destroy;
        getDebugState = getDebugState;
      }
    }));

    vi.doMock("../shared/messages", () => ({
      isContentCommand: vi.fn((message: { type?: string }) => String(message.type).startsWith("AUTO_BOOSTER_"))
    }));

    vi.stubGlobal(
      "window",
      {
        addEventListener: vi.fn()
      } as unknown as Window & typeof globalThis
    );
    vi.stubGlobal(
      "chrome",
      {
        runtime: {
          onMessage: {
            addListener: onMessageAddListener
          }
        }
      } as unknown as typeof chrome
    );

    await import("./main");

    const runtimeListener = onMessageAddListener.mock.calls[0][0] as (
      message: unknown,
      sender: unknown,
      sendResponse: (value: unknown) => void
    ) => boolean;
    const sendResponse = vi.fn();

    expect(
      runtimeListener(
        {
          type: "AUTO_BOOSTER_CONFIGURE",
          payload: { tabId: 1, scope: "global", enabled: true, suspended: false, gainPercent: 150, advancedAudioSettings: {} }
        },
        {},
        sendResponse
      )
    ).toBe(true);
    await Promise.resolve();
    await Promise.resolve();

    expect(sendResponse).toHaveBeenCalledWith(undefined);
  });
});
