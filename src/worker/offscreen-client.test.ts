import { OFFSCREEN_DOCUMENT_PATH, OFFSCREEN_JUSTIFICATION } from "../shared/constants";
import { OffscreenClient } from "./offscreen-client";

describe("OffscreenClient", () => {
  const createDocument = vi.fn();
  const closeDocument = vi.fn();
  const getContexts = vi.fn();
  const sendMessage = vi.fn();
  const getUrl = vi.fn((path: string) => `chrome-extension://extension/${path}`);

  beforeEach(() => {
    createDocument.mockReset();
    closeDocument.mockReset();
    getContexts.mockReset();
    sendMessage.mockReset();
    getUrl.mockClear();

    vi.stubGlobal(
      "chrome",
      {
        runtime: {
          getContexts,
          getURL: getUrl,
          sendMessage
        },
        offscreen: {
          createDocument,
          closeDocument,
          Reason: {
            USER_MEDIA: "USER_MEDIA"
          }
        }
      } as unknown as typeof chrome
    );
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("creates the offscreen document only when missing", async () => {
    const client = new OffscreenClient();
    getContexts.mockResolvedValueOnce([]);
    await client.ensureDocument();
    expect(createDocument).toHaveBeenCalledTimes(1);
    expect(getContexts).toHaveBeenNthCalledWith(1, {
      contextTypes: ["OFFSCREEN_DOCUMENT"],
      documentUrls: [`chrome-extension://extension/${OFFSCREEN_DOCUMENT_PATH}`]
    });
    expect(createDocument).toHaveBeenCalledWith({
      url: OFFSCREEN_DOCUMENT_PATH,
      reasons: ["USER_MEDIA"],
      justification: OFFSCREEN_JUSTIFICATION
    });

    getContexts.mockResolvedValueOnce([{ contextType: "OFFSCREEN_DOCUMENT" }]);
    await client.ensureDocument();
    expect(createDocument).toHaveBeenCalledTimes(1);
  });

  it("starts sessions and updates settings through the offscreen document", async () => {
    const client = new OffscreenClient();
    const sessions = [{ tabId: 7, gainPercent: 220 }];

    getContexts
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([{ contextType: "OFFSCREEN_DOCUMENT" }]);
    sendMessage
      .mockResolvedValueOnce({ ok: true, data: { sessions } })
      .mockResolvedValueOnce({ ok: true, data: { sessions } })
      .mockResolvedValueOnce({ ok: true, data: { sessions } });

    await expect(
      client.startSession({
        tabId: 7,
        streamId: "stream-id",
        title: "Test tab",
        url: "https://youtube.com/watch?v=1",
        domain: "youtube.com",
        gainPercent: 220,
        advancedAudioSettings: {} as never
      })
    ).resolves.toEqual(sessions);
    await expect(client.setGain(7, 260)).resolves.toEqual(sessions);

    getContexts.mockResolvedValueOnce([{ contextType: "OFFSCREEN_DOCUMENT" }]);
    await expect(client.setAdvancedAudioSettings({} as never)).resolves.toEqual(sessions);

    expect(sendMessage).toHaveBeenNthCalledWith(1, {
      type: "OFFSCREEN_START_SESSION",
      payload: {
        tabId: 7,
        streamId: "stream-id",
        title: "Test tab",
        url: "https://youtube.com/watch?v=1",
        domain: "youtube.com",
        gainPercent: 220,
        advancedAudioSettings: {} as never
      }
    });
    expect(sendMessage).toHaveBeenNthCalledWith(2, {
      type: "OFFSCREEN_SET_GAIN",
      payload: { tabId: 7, gainPercent: 260 }
    });
    expect(sendMessage).toHaveBeenNthCalledWith(3, {
      type: "OFFSCREEN_SET_ADVANCED_AUDIO_SETTINGS",
      payload: {} as never
    });
  });

  it("returns an empty snapshot when the offscreen document is absent", async () => {
    const client = new OffscreenClient();
    getContexts.mockResolvedValueOnce([]);
    await expect(client.getSnapshot()).resolves.toEqual([]);
  });

  it("reports whether the offscreen document exists", async () => {
    const client = new OffscreenClient();
    getContexts.mockResolvedValueOnce([{ contextType: "OFFSCREEN_DOCUMENT" }]);
    await expect(client.hasDocument()).resolves.toBe(true);
    expect(getContexts).toHaveBeenNthCalledWith(1, {
      contextTypes: ["OFFSCREEN_DOCUMENT"],
      documentUrls: [`chrome-extension://extension/${OFFSCREEN_DOCUMENT_PATH}`]
    });

    getContexts.mockResolvedValueOnce([]);
    await expect(client.hasDocument()).resolves.toBe(false);
  });

  it("returns snapshot sessions only when the response is successful", async () => {
    const client = new OffscreenClient();
    getContexts.mockResolvedValue([{ contextType: "OFFSCREEN_DOCUMENT" }]);
    sendMessage
      .mockResolvedValueOnce({ ok: true, data: { sessions: [{ tabId: 1 }] } })
      .mockResolvedValueOnce({ ok: false });

    await expect(client.getSnapshot()).resolves.toEqual([{ tabId: 1 }]);
    await expect(client.getSnapshot()).resolves.toEqual([]);

    expect(sendMessage).toHaveBeenNthCalledWith(1, { type: "OFFSCREEN_GET_SNAPSHOT" });
    expect(sendMessage).toHaveBeenNthCalledWith(2, { type: "OFFSCREEN_GET_SNAPSHOT" });
  });

  it("retries the message after recreating the offscreen receiver", async () => {
    const client = new OffscreenClient();
    const setTimeoutSpy = vi.spyOn(globalThis, "setTimeout");

    getContexts
      .mockResolvedValueOnce([{ contextType: "OFFSCREEN_DOCUMENT" }])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([{ contextType: "OFFSCREEN_DOCUMENT" }]);

    sendMessage
      .mockRejectedValueOnce(new Error("Could not establish connection. Receiving end does not exist."))
      .mockResolvedValueOnce({
        ok: true,
        data: { sessions: [{ tabId: 1 }] }
      });

    await expect(client.getSnapshot()).resolves.toEqual([{ tabId: 1 }]);
    expect(createDocument).toHaveBeenCalledTimes(1);
    expect(sendMessage).toHaveBeenCalledTimes(2);
    expect(setTimeoutSpy).toHaveBeenCalledWith(expect.any(Function), 50);
  });

  it("closes the offscreen document when there are no sessions left", async () => {
    const client = new OffscreenClient();
    getContexts.mockResolvedValueOnce([{ contextType: "OFFSCREEN_DOCUMENT" }]);
    await client.closeIfIdle(0);
    expect(closeDocument).toHaveBeenCalledTimes(1);
  });

  it("does not close the offscreen document when sessions remain or the document is absent", async () => {
    const client = new OffscreenClient();

    await client.closeIfIdle(2);
    expect(closeDocument).not.toHaveBeenCalled();

    getContexts.mockResolvedValueOnce([]);
    await client.closeIfIdle(0);
    expect(closeDocument).not.toHaveBeenCalled();
  });

  it("throws localized errors when offscreen operations return failures", async () => {
    const client = new OffscreenClient();
    getContexts
      .mockResolvedValue([{ contextType: "OFFSCREEN_DOCUMENT" }])
      .mockResolvedValue([{ contextType: "OFFSCREEN_DOCUMENT" }])
      .mockResolvedValue([{ contextType: "OFFSCREEN_DOCUMENT" }])
      .mockResolvedValue([{ contextType: "OFFSCREEN_DOCUMENT" }])
      .mockResolvedValue([{ contextType: "OFFSCREEN_DOCUMENT" }]);
    sendMessage.mockResolvedValue({ ok: false, errorMessage: { key: "errorNoRunningSession" } });

    await expect(client.setGain(1, 200)).rejects.toEqual({ key: "errorNoRunningSession" });
    await expect(client.updateMetadata({ tabId: 1, title: "x", url: "https://x.com", domain: "x.com" })).rejects.toEqual({
      key: "errorNoRunningSession"
    });
    await expect(client.stopSession(1)).rejects.toEqual({ key: "errorNoRunningSession" });
    await expect(client.stopAll()).rejects.toEqual({ key: "errorNoRunningSession" });
  });

  it("falls back to the default localized errors when the offscreen response has no error payload", async () => {
    const client = new OffscreenClient();
    getContexts.mockResolvedValue([{ contextType: "OFFSCREEN_DOCUMENT" }]);
    sendMessage.mockResolvedValue({ ok: false });

    await expect(
      client.startSession({
        tabId: 7,
        streamId: "stream-id",
        title: "Test tab",
        url: "https://youtube.com/watch?v=1",
        domain: "youtube.com",
        gainPercent: 220,
        advancedAudioSettings: {} as never
      })
    ).rejects.toEqual({ key: "errorOffscreenStartSession" });
    await expect(client.setGain(1, 200)).rejects.toEqual({ key: "errorOffscreenSetGain" });
    await expect(client.setAdvancedAudioSettings({} as never)).rejects.toEqual({
      key: "errorOffscreenSetAudioSettings"
    });
    await expect(
      client.updateMetadata({ tabId: 1, title: "x", url: "https://x.com", domain: "x.com" })
    ).rejects.toEqual({ key: "errorOffscreenUpdateMetadata" });
    await expect(client.stopSession(1)).rejects.toEqual({ key: "errorOffscreenStopSession" });
    await expect(client.stopAll()).rejects.toEqual({ key: "errorOffscreenStopAll" });
  });

  it("returns session lists for successful metadata and stop operations", async () => {
    const client = new OffscreenClient();
    const sessions = [{ tabId: 7, gainPercent: 220 }];
    getContexts
      .mockResolvedValue([{ contextType: "OFFSCREEN_DOCUMENT" }])
      .mockResolvedValue([{ contextType: "OFFSCREEN_DOCUMENT" }]);
    sendMessage
      .mockResolvedValueOnce({ ok: true, data: { sessions } })
      .mockResolvedValueOnce({ ok: true, data: { sessions } })
      .mockResolvedValueOnce({ ok: true, data: { sessions } });

    await expect(
      client.updateMetadata({ tabId: 7, title: "YouTube", url: "https://youtube.com", domain: "youtube.com" })
    ).resolves.toEqual(sessions);
    await expect(client.stopSession(7)).resolves.toEqual(sessions);
    await expect(client.stopAll()).resolves.toEqual(sessions);

    expect(sendMessage).toHaveBeenNthCalledWith(1, {
      type: "OFFSCREEN_UPDATE_METADATA",
      payload: { tabId: 7, title: "YouTube", url: "https://youtube.com", domain: "youtube.com" }
    });
    expect(sendMessage).toHaveBeenNthCalledWith(2, {
      type: "OFFSCREEN_STOP_SESSION",
      payload: { tabId: 7 }
    });
    expect(sendMessage).toHaveBeenNthCalledWith(3, { type: "OFFSCREEN_STOP_ALL" });
  });

  it("returns an empty list when no document exists for advanced settings or stop operations", async () => {
    const client = new OffscreenClient();
    getContexts.mockResolvedValue([]);

    await expect(client.setAdvancedAudioSettings({} as never)).resolves.toEqual([]);
    await expect(client.stopSession(1)).resolves.toEqual([]);
    await expect(client.stopAll()).resolves.toEqual([]);
  });

  it("throws the original error when delivery fails for a reason other than a missing receiver", async () => {
    const client = new OffscreenClient();
    getContexts.mockResolvedValue([{ contextType: "OFFSCREEN_DOCUMENT" }]);
    sendMessage.mockRejectedValue(new Error("boom"));

    await expect(client.getSnapshot()).rejects.toThrow("boom");
  });

  it("stops retrying after the allowed attempts when the receiver keeps missing", async () => {
    const client = new OffscreenClient() as unknown as {
      sendOffscreenMessage(command: { type: "OFFSCREEN_GET_SNAPSHOT" }, attempts: number): Promise<unknown>;
    };
    const setTimeoutSpy = vi.spyOn(globalThis, "setTimeout");
    getContexts.mockResolvedValue([]);
    sendMessage.mockRejectedValue(new Error("Could not establish connection. Receiving end does not exist."));

    await expect(client.sendOffscreenMessage({ type: "OFFSCREEN_GET_SNAPSHOT" }, 2)).rejects.toThrow(
      "Receiving end does not exist"
    );

    expect(createDocument).toHaveBeenCalledTimes(1);
    expect(sendMessage).toHaveBeenCalledTimes(2);
    expect(setTimeoutSpy).toHaveBeenCalledWith(expect.any(Function), 50);
  });

  it("throws the undeliverable fallback when the internal retry loop is bypassed", async () => {
    const client = new OffscreenClient() as unknown as {
      sendOffscreenMessage(command: { type: "OFFSCREEN_GET_SNAPSHOT" }, attempts: number): Promise<unknown>;
    };

    await expect(
      client.sendOffscreenMessage({ type: "OFFSCREEN_GET_SNAPSHOT" }, 0)
    ).rejects.toEqual({ key: "errorOffscreenMessageUndeliverable" });
  });
});
