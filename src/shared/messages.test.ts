/**
 * @fileoverview Validates typed runtime message helpers and family guards used
 * across extension contexts.
 * @module shared/messages.test
 */

import {
  fail,
  isContentCommand,
  isContentEvent,
  isLocalizedMessage,
  isOffscreenCommand,
  isOffscreenEvent,
  isPopupCommand,
  message,
  ok,
  sendMessage,
  sendMessageSafe
} from "./messages";

describe("messages helpers", () => {
  const runtimeSendMessage = vi.fn();

  beforeEach(() => {
    runtimeSendMessage.mockReset();

    vi.stubGlobal(
      "chrome",
      {
        runtime: {
          sendMessage: runtimeSendMessage
        }
      } as unknown as typeof chrome
    );
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("exposes ok, fail and message helpers with typed payloads", () => {
    expect(ok({ ready: true })).toEqual({ ok: true, data: { ready: true } });
    expect(fail(message("errorRuntimeNoResponse"))).toEqual({
      ok: false,
      errorMessage: { key: "errorRuntimeNoResponse" }
    });
    expect(message("rememberSite", { domain: "youtube.com" })).toEqual({
      key: "rememberSite",
      substitutions: { domain: "youtube.com" }
    });
  });

  it("recognizes popup, offscreen, content and event message families", () => {
    const popupTypes = [
      "GET_STATE",
      "GET_DEBUG_STATE",
      "START_CAPTURE",
      "ENABLE_CURRENT_TAB_BOOSTER",
      "DISABLE_CURRENT_TAB_BOOSTER",
      "ENABLE_GLOBAL_AUTO_BOOSTER",
      "DISABLE_GLOBAL_AUTO_BOOSTER",
      "REQUEST_SITE_PERMISSION",
      "REQUEST_GLOBAL_PERMISSION",
      "SET_GAIN",
      "SAVE_DOMAIN_GAIN",
      "REMOVE_DOMAIN_GAIN",
      "GET_ADVANCED_AUDIO_SETTINGS",
      "SET_ADVANCED_AUDIO_SETTINGS",
      "STOP_CAPTURE",
      "STOP_ALL"
    ];
    const offscreenTypes = [
      "OFFSCREEN_START_SESSION",
      "OFFSCREEN_SET_GAIN",
      "OFFSCREEN_SET_ADVANCED_AUDIO_SETTINGS",
      "OFFSCREEN_STOP_SESSION",
      "OFFSCREEN_STOP_ALL",
      "OFFSCREEN_GET_SNAPSHOT",
      "OFFSCREEN_UPDATE_METADATA"
    ];
    const contentTypes = [
      "AUTO_BOOSTER_PING",
      "AUTO_BOOSTER_CONFIGURE",
      "AUTO_BOOSTER_DISABLE",
      "AUTO_BOOSTER_SHOW_FALLBACK_TOAST",
      "AUTO_BOOSTER_HIDE_FALLBACK_TOAST",
      "AUTO_BOOSTER_GET_DEBUG_STATE"
    ];
    const offscreenEventTypes = ["SESSION_LEVEL_UPDATE", "SESSION_STATUS_UPDATE", "OFFSCREEN_SNAPSHOT"];
    const contentEventTypes = [
      "AUTO_BOOSTER_FRAME_READY",
      "AUTO_SESSION_STATUS_UPDATE",
      "AUTO_SESSION_LEVEL_UPDATE",
      "AUTO_SESSION_ATTACH_FAILED",
      "AUTO_MANUAL_FALLBACK_REQUESTED",
      "AUTO_FALLBACK_TOAST_DISMISSED"
    ];

    expect(isPopupCommand(null)).toBe(false);
    expect(isPopupCommand({})).toBe(false);
    expect(isPopupCommand({ foo: "GET_STATE" })).toBe(false);
    expect(isPopupCommand({ type: "UNKNOWN" })).toBe(false);
    for (const type of popupTypes) {
      expect(isPopupCommand({ type })).toBe(true);
    }

    expect(isOffscreenCommand(undefined)).toBe(false);
    expect(isOffscreenCommand({})).toBe(false);
    expect(isOffscreenCommand({ type: "GET_STATE" })).toBe(false);
    for (const type of offscreenTypes) {
      expect(isOffscreenCommand({ type })).toBe(true);
    }

    expect(isContentCommand("AUTO_BOOSTER_CONFIGURE")).toBe(false);
    expect(isContentCommand({})).toBe(false);
    expect(isContentCommand({ type: "AUTO_BOOSTER_WHATEVER" })).toBe(false);
    for (const type of contentTypes) {
      expect(isContentCommand({ type })).toBe(true);
    }

    expect(isOffscreenEvent({})).toBe(false);
    expect(isOffscreenEvent({ type: "AUTO_SESSION_LEVEL_UPDATE" })).toBe(false);
    for (const type of offscreenEventTypes) {
      expect(isOffscreenEvent({ type })).toBe(true);
    }

    expect(isContentEvent(123)).toBe(false);
    expect(isContentEvent({})).toBe(false);
    expect(isContentEvent({ type: "SESSION_STATUS_UPDATE" })).toBe(false);
    for (const type of contentEventTypes) {
      expect(isContentEvent({ type })).toBe(true);
    }
  });

  it("recognizes localized message descriptors", () => {
    expect(isLocalizedMessage({ key: "errorRuntimeNoResponse" })).toBe(true);
    expect(isLocalizedMessage({ key: 123 })).toBe(false);
    expect(isLocalizedMessage({})).toBe(false);
    expect(isLocalizedMessage(null)).toBe(false);
    expect(isLocalizedMessage("errorRuntimeNoResponse")).toBe(false);
  });

  it("returns raw runtime responses through sendMessage", async () => {
    runtimeSendMessage.mockResolvedValue({ ok: true, data: { sessions: [] } });

    await expect(sendMessage({ type: "GET_STATE" })).resolves.toEqual({
      ok: true,
      data: { sessions: [] }
    });
    expect(runtimeSendMessage).toHaveBeenCalledWith({ type: "GET_STATE" });
  });

  it("supports synchronous chrome.runtime.sendMessage responses", async () => {
    runtimeSendMessage.mockReturnValue({ ok: true, data: { ready: true } });

    await expect(sendMessage({ type: "GET_STATE" })).resolves.toEqual({
      ok: true,
      data: { ready: true }
    });
  });

  it("converts an undefined runtime response into a controlled failure", async () => {
    runtimeSendMessage.mockResolvedValue(undefined);

    await expect(sendMessageSafe({ type: "GET_STATE" })).resolves.toEqual({
      ok: false,
      errorMessage: { key: "errorRuntimeNoResponse" }
    });
  });

  it("converts a rejected runtime message into a controlled failure", async () => {
    runtimeSendMessage.mockRejectedValue(new Error("Could not establish connection. Receiving end does not exist."));

    await expect(sendMessageSafe({ type: "GET_STATE" })).resolves.toEqual({
      ok: false,
      errorMessage: { key: "errorRuntimeMessageUndeliverable" }
    });
  });

  it("passes through already-normalized runtime responses", async () => {
    runtimeSendMessage.mockResolvedValue({
      ok: false,
      errorMessage: { key: "errorExtensionActionFailed" }
    });

    await expect(sendMessageSafe({ type: "GET_STATE" })).resolves.toEqual({
      ok: false,
      errorMessage: { key: "errorExtensionActionFailed" }
    });
  });

  it("normalizes null and malformed runtime responses into controlled failures", async () => {
    runtimeSendMessage
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce("bad-response")
      .mockResolvedValueOnce({ ok: "yes" });

    await expect(sendMessageSafe({ type: "GET_STATE" })).resolves.toEqual({
      ok: false,
      errorMessage: { key: "errorRuntimeNoResponse" }
    });
    await expect(sendMessageSafe({ type: "GET_STATE" })).resolves.toEqual({
      ok: false,
      errorMessage: { key: "errorRuntimeNoResponse" }
    });
    await expect(sendMessageSafe({ type: "GET_STATE" })).resolves.toEqual({
      ok: false,
      errorMessage: { key: "errorRuntimeNoResponse" }
    });
  });
});
