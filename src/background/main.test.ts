describe("background main entrypoint", () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it("boots the orchestrator and wires chrome listeners", async () => {
    const bootstrap = vi.fn().mockResolvedValue(undefined);
    const handlePopupCommand = vi.fn().mockResolvedValue({ ok: true });
    const handleBackgroundEvent = vi.fn().mockResolvedValue(undefined);
    const handleTabUpdated = vi.fn().mockResolvedValue(undefined);
    const handleTabActivated = vi.fn().mockResolvedValue(undefined);
    const handleTabRemoved = vi.fn().mockResolvedValue(undefined);
    const handleCaptureStatusChanged = vi.fn().mockResolvedValue(undefined);
    const onStartupAddListener = vi.fn();
    const onInstalledAddListener = vi.fn();
    const onMessageAddListener = vi.fn();
    const onUpdatedAddListener = vi.fn();
    const onActivatedAddListener = vi.fn();
    const onRemovedAddListener = vi.fn();
    const onStatusChangedAddListener = vi.fn();

    vi.doMock("../worker/orchestrator", () => ({
      WorkerOrchestrator: class {
        bootstrap = bootstrap;
        handlePopupCommand = handlePopupCommand;
        handleBackgroundEvent = handleBackgroundEvent;
        handleTabUpdated = handleTabUpdated;
        handleTabActivated = handleTabActivated;
        handleTabRemoved = handleTabRemoved;
        handleCaptureStatusChanged = handleCaptureStatusChanged;
      }
    }));

    vi.doMock("../shared/messages", () => ({
      isPopupCommand: vi.fn((message: { type?: string }) => message.type === "GET_STATE"),
      isOffscreenEvent: vi.fn((message: { type?: string }) => message.type === "SESSION_LEVEL_UPDATE"),
      isContentEvent: vi.fn((message: { type?: string }) => message.type === "AUTO_SESSION_STATUS_UPDATE")
    }));

    vi.stubGlobal(
      "chrome",
      {
        runtime: {
          onStartup: { addListener: onStartupAddListener },
          onInstalled: { addListener: onInstalledAddListener },
          onMessage: { addListener: onMessageAddListener }
        },
        tabs: {
          onUpdated: { addListener: onUpdatedAddListener },
          onActivated: { addListener: onActivatedAddListener },
          onRemoved: { addListener: onRemovedAddListener }
        },
        tabCapture: {
          onStatusChanged: { addListener: onStatusChangedAddListener }
        }
      } as unknown as typeof chrome
    );

    await import("./main");

    expect(bootstrap).toHaveBeenCalledTimes(1);
    expect(onStartupAddListener).toHaveBeenCalledTimes(1);
    expect(onInstalledAddListener).toHaveBeenCalledTimes(1);
    expect(onMessageAddListener).toHaveBeenCalledTimes(1);
    expect(onUpdatedAddListener).toHaveBeenCalledTimes(1);
    expect(onActivatedAddListener).toHaveBeenCalledTimes(1);
    expect(onRemovedAddListener).toHaveBeenCalledTimes(1);
    expect(onStatusChangedAddListener).toHaveBeenCalledTimes(1);

    const runtimeMessageListener = onMessageAddListener.mock.calls[0][0] as (
      message: unknown,
      sender: unknown,
      sendResponse: (value: unknown) => void
    ) => boolean;

    const sendResponse = vi.fn();
    expect(runtimeMessageListener({ type: "GET_STATE" }, {}, sendResponse)).toBe(true);
    await Promise.resolve();
    expect(handlePopupCommand).toHaveBeenCalledWith({ type: "GET_STATE" });

    expect(runtimeMessageListener({ type: "SESSION_LEVEL_UPDATE" }, {}, sendResponse)).toBe(false);
    await Promise.resolve();
    expect(handleBackgroundEvent).toHaveBeenCalledWith({ type: "SESSION_LEVEL_UPDATE" }, {});

    expect(runtimeMessageListener({ type: "AUTO_SESSION_STATUS_UPDATE" }, {}, sendResponse)).toBe(false);
    await Promise.resolve();
    expect(handleBackgroundEvent).toHaveBeenCalledWith({ type: "AUTO_SESSION_STATUS_UPDATE" }, {});

    expect(runtimeMessageListener({ type: "UNKNOWN" }, {}, sendResponse)).toBe(false);

    const startupListener = onStartupAddListener.mock.calls[0][0] as () => void;
    const installedListener = onInstalledAddListener.mock.calls[0][0] as () => void;
    const updatedListener = onUpdatedAddListener.mock.calls[0][0] as (
      tabId: number,
      changeInfo: { status?: string },
      tab: chrome.tabs.Tab
    ) => void;
    const activatedListener = onActivatedAddListener.mock.calls[0][0] as (
      activeInfo: { tabId: number }
    ) => void;
    const removedListener = onRemovedAddListener.mock.calls[0][0] as (tabId: number) => void;
    const captureListener = onStatusChangedAddListener.mock.calls[0][0] as (
      info: chrome.tabCapture.CaptureInfo
    ) => void;

    bootstrap.mockRejectedValueOnce(new Error("startup failed"));
    startupListener();
    bootstrap.mockRejectedValueOnce(new Error("install failed"));
    installedListener();
    updatedListener(9, { status: "complete" }, { id: 9 } as chrome.tabs.Tab);
    activatedListener({ tabId: 9 });
    removedListener(9);
    captureListener({ tabId: 9, status: "active" } as chrome.tabCapture.CaptureInfo);
    await Promise.resolve();

    expect(handleTabUpdated).toHaveBeenCalledWith(9, { status: "complete" }, { id: 9 });
    expect(handleTabActivated).toHaveBeenCalledWith({ tabId: 9 });
    expect(handleTabRemoved).toHaveBeenCalledWith(9);
    expect(handleCaptureStatusChanged).toHaveBeenCalledWith({ tabId: 9, status: "active" });
  });
});
