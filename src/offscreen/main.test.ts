// @vitest-environment happy-dom

describe("offscreen main entrypoint", () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it("sets document metadata and routes runtime commands to the session manager", async () => {
    const startSession = vi.fn().mockResolvedValue({ ok: true });
    const setGain = vi.fn().mockResolvedValue({ ok: true });
    const setAdvancedAudioSettings = vi.fn().mockResolvedValue({ ok: true });
    const stopSession = vi.fn().mockResolvedValue({ ok: true });
    const stopAll = vi.fn().mockResolvedValue({ ok: true });
    const updateMetadata = vi.fn().mockResolvedValue({ ok: true });
    const getSnapshot = vi.fn().mockReturnValue([{ tabId: 1 }]);
    const onMessageAddListener = vi.fn();

    vi.doMock("./session-manager", () => ({
      OffscreenSessionManager: class {
        startSession = startSession;
        setGain = setGain;
        setAdvancedAudioSettings = setAdvancedAudioSettings;
        stopSession = stopSession;
        stopAll = stopAll;
        updateMetadata = updateMetadata;
        getSnapshot = getSnapshot;
      }
    }));

    const setDocumentLocaleAttributes = vi.fn();
    const t = vi.fn().mockReturnValue("Offscreen doc");
    vi.doMock("../shared/runtime-i18n", () => ({
      setDocumentLocaleAttributes,
      t
    }));

    vi.doMock("../shared/messages", () => ({
      isOffscreenCommand: vi.fn((message: { type?: string }) => String(message.type).startsWith("OFFSCREEN_"))
    }));

    Object.defineProperty(document, "title", {
      configurable: true,
      writable: true,
      value: ""
    });

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

    expect(setDocumentLocaleAttributes).toHaveBeenCalledWith(document);
    expect(document.title).toBe("Offscreen doc");
    expect(onMessageAddListener).toHaveBeenCalledTimes(1);

    const listener = onMessageAddListener.mock.calls[0][0] as (
      message: unknown,
      sender: unknown,
      sendResponse: (value: unknown) => void
    ) => boolean;
    const sendResponse = vi.fn();

    expect(listener({ type: "OFFSCREEN_START_SESSION", payload: { tabId: 1 } }, {}, sendResponse)).toBe(true);
    await Promise.resolve();
    expect(startSession).toHaveBeenCalledWith({ tabId: 1 });

    expect(listener({ type: "OFFSCREEN_SET_GAIN", payload: { tabId: 1, gainPercent: 200 } }, {}, sendResponse)).toBe(true);
    await Promise.resolve();
    expect(setGain).toHaveBeenCalledWith(1, 200);

    expect(listener({ type: "OFFSCREEN_SET_ADVANCED_AUDIO_SETTINGS", payload: { releaseMs: 120 } }, {}, sendResponse)).toBe(true);
    await Promise.resolve();
    expect(setAdvancedAudioSettings).toHaveBeenCalledWith({ releaseMs: 120 });

    expect(listener({ type: "OFFSCREEN_STOP_SESSION", payload: { tabId: 1 } }, {}, sendResponse)).toBe(true);
    await Promise.resolve();
    expect(stopSession).toHaveBeenCalledWith(1);

    expect(listener({ type: "OFFSCREEN_STOP_ALL" }, {}, sendResponse)).toBe(true);
    await Promise.resolve();
    expect(stopAll).toHaveBeenCalled();

    expect(listener({ type: "OFFSCREEN_UPDATE_METADATA", payload: { tabId: 1 } }, {}, sendResponse)).toBe(true);
    await Promise.resolve();
    expect(updateMetadata).toHaveBeenCalledWith({ tabId: 1 });

    expect(listener({ type: "OFFSCREEN_GET_SNAPSHOT" }, {}, sendResponse)).toBe(true);
    expect(sendResponse).toHaveBeenCalledWith({ ok: true, data: { sessions: [{ tabId: 1 }] } });

    expect(listener({ type: "GET_STATE" }, {}, sendResponse)).toBe(false);
  });
});
