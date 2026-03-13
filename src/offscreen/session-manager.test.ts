const sessionManagerFaustMetaHoisted = vi.hoisted(() => ({
  default: {
    name: "prism-premium-test",
    compile_options: "-single",
    ui: [
      { shortname: "controls_input_drive_db", address: "/controls/input_drive_db" },
      { shortname: "controls_normalization_enabled", address: "/controls/normalization_enabled" },
      { shortname: "controls_normalization_gain_db", address: "/controls/normalization_gain_db" },
      { shortname: "controls_lookahead_ms", address: "/controls/lookahead_ms" },
      { shortname: "controls_release_ms", address: "/controls/release_ms" },
      { shortname: "controls_multiband_depth", address: "/controls/multiband_depth" },
      { shortname: "controls_protector_enabled", address: "/controls/protector_enabled" },
      { shortname: "controls_output_limiter_enabled", address: "/controls/output_limiter_enabled" },
      { shortname: "controls_low_band_trim_db", address: "/controls/low_band_trim_db" },
      { shortname: "controls_low_band_makeup_db", address: "/controls/low_band_makeup_db" },
      { shortname: "controls_low_band_threshold_offset_db", address: "/controls/low_band_threshold_offset_db" },
      { shortname: "controls_low_band_ratio_bias", address: "/controls/low_band_ratio_bias" },
      { shortname: "controls_mid_high_threshold_offset_db", address: "/controls/mid_high_threshold_offset_db" },
      { shortname: "controls_output_ceiling_db", address: "/controls/output_ceiling_db" },
      { shortname: "controls_output_soft_clip_mix", address: "/controls/output_soft_clip_mix" },
      { shortname: "controls_clarity_presence_tilt_db", address: "/controls/clarity_presence_tilt_db" },
      { shortname: "controls_tone_low_band_gain_db", address: "/controls/tone_low_band_gain_db" },
      { shortname: "controls_tone_mid_band_gain_db", address: "/controls/tone_mid_band_gain_db" }
    ]
  }
}));

vi.mock("../generated/faust/mono/dsp-meta", () => sessionManagerFaustMetaHoisted);
vi.mock("../generated/faust/stereo/dsp-meta", () => sessionManagerFaustMetaHoisted);

import { DEFAULT_ADVANCED_AUDIO_SETTINGS } from "../shared/audio-settings";
import { message } from "../shared/messages";
import type { CaptureSessionState } from "../shared/types";
import {
  createOffscreenSessionManager,
  type AudioSessionFactory,
  type AudioSessionPort,
  type OffscreenSessionManager
} from "./session-manager";

type MockedAudioSessionPort = AudioSessionPort & {
  start: ReturnType<typeof vi.fn>;
  setGainPercent: ReturnType<typeof vi.fn>;
  setAdvancedAudioSettings: ReturnType<typeof vi.fn>;
  stop: ReturnType<typeof vi.fn>;
};

function makeAudioSessionPort(overrides: Partial<AudioSessionPort> = {}): MockedAudioSessionPort {
  return {
    start: vi.fn(async () => undefined),
    setGainPercent: vi.fn(),
    setAdvancedAudioSettings: vi.fn(),
    stop: vi.fn(async () => undefined),
    ...overrides
  } as unknown as MockedAudioSessionPort;
}

function makeStartPayload(tabId: number, gainPercent: number, domain: string) {
  return {
    tabId,
    streamId: `stream-${tabId}`,
    gainPercent,
    advancedAudioSettings: { ...DEFAULT_ADVANCED_AUDIO_SETTINGS },
    title: `Tab ${tabId}`,
    url: `https://${domain}/video`,
    domain
  };
}

function makeManager(
  now: () => number,
  createAudioSession: AudioSessionFactory
): OffscreenSessionManager {
  return createOffscreenSessionManager(now, createAudioSession);
}

describe("OffscreenSessionManager", () => {
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

  it("manages independent sessions and tears down only the requested one", async () => {
    const sessions: AudioSessionPort[] = [];
    const createAudioSession: AudioSessionFactory = () => {
      const session = makeAudioSessionPort();
      sessions.push(session);
      return session;
    };

    const manager = makeManager(() => 1_000, createAudioSession);

    await manager.startSession(makeStartPayload(1, 220, "one.example"));
    await manager.startSession(makeStartPayload(2, 180, "two.example"));
    await manager.setGain(2, 260);
    await manager.stopSession(1);

    expect(manager.getSnapshot()).toHaveLength(1);
    expect(sessions[0].stop).toHaveBeenCalledTimes(1);
    expect(sessions[1].setGainPercent).toHaveBeenCalledWith(260);
    expect(manager.getSnapshot()[0]).toMatchObject({
      tabId: 2,
      gainPercent: 260,
      engineStatus: "ready"
    });
  });

  it("returns a failure response when the audio pipeline cannot start", async () => {
    const audioSession = makeAudioSessionPort({
      start: vi.fn(async () => {
        throw new Error("boom");
      })
    });
    const createAudioSession: AudioSessionFactory = () =>
      audioSession;

    const manager = makeManager(() => 2_000, createAudioSession);
    const response = await manager.startSession(makeStartPayload(3, 300, "broken.example"));

    expect(response.ok).toBe(false);
    expect(response.errorMessage).toEqual({ key: "errorAudioPipelineStart" });
    expect(audioSession.stop).toHaveBeenCalledTimes(1);
    expect(manager.getSnapshot()).toEqual([]);
  });

  it("creates manual sessions with exact default state and publishes pending then ready status", async () => {
    const audioSession = makeAudioSessionPort();
    const manager = makeManager(() => 1_234, () => audioSession);

    const response = await manager.startSession(makeStartPayload(9, 240, "nine.example"));

    expect(response).toEqual({
      ok: true,
      data: {
        sessions: [
          {
            tabId: 9,
            title: "Tab 9",
            url: "https://nine.example/video",
            domain: "nine.example",
            gainPercent: 240,
            favIconUrl: undefined,
            engineLane: "manual_tab_capture",
            autoAttachState: "idle",
            streamState: "active",
            engineStatus: "ready",
            level: 0,
            warning: "none",
            protectorActionDb: 0,
            clipEvents: 0,
            clipPeak: 0,
            protectionBypassed: false,
            outputPeak: 0,
            updatedAt: 1234
          }
        ]
      }
    });
    expect(runtimeSendMessage).toHaveBeenNthCalledWith(1, {
      type: "SESSION_STATUS_UPDATE",
      payload: {
        tabId: 9,
        streamState: "pending",
        engineStatus: "loading",
        gainPercent: 240,
        lastError: undefined
      }
    });
    expect(runtimeSendMessage).toHaveBeenNthCalledWith(2, {
      type: "SESSION_STATUS_UPDATE",
      payload: {
        tabId: 9,
        streamState: "active",
        engineStatus: "ready",
        gainPercent: 240,
        lastError: undefined
      }
    });
  });

  it("keeps snapshot ordering stable when live telemetry updates arrive", async () => {
    const telemetryCallbacks: Array<(payload: Parameters<Parameters<AudioSessionFactory>[2]["onTelemetry"]>[0]) => void> = [];

    const createAudioSession: AudioSessionFactory = (_gainPercent, _settings, callbacks) => {
      telemetryCallbacks.push(callbacks.onTelemetry);

      return makeAudioSessionPort();
    };

    const manager = makeManager(() => 100, createAudioSession);

    await manager.startSession(makeStartPayload(1, 220, "one.example"));
    await manager.startSession(makeStartPayload(2, 180, "two.example"));
    telemetryCallbacks[0]({
      level: 0.95,
      warning: "danger",
      metrics: {
        protectorActionDb: 8.5,
        clipEvents: 2,
        clipPeak: 1.18,
        protectionBypassed: false,
        inputPeak: 0.9,
        outputPeak: 0.82,
        normalizationInputLoudnessDb: null,
        normalizationAppliedGainDb: 0,
        normalizationOffsetScore: 0,
        normalizationAction: "holding",
        normalizationLoadPercent: 0
      }
    });

    expect(manager.getSnapshot().map((session) => session.tabId)).toEqual([1, 2]);
  });

  it("publishes exact telemetry payloads and stores the latest telemetry values", async () => {
    let telemetryCallback: Parameters<AudioSessionFactory>[2]["onTelemetry"] | undefined;
    const createAudioSession: AudioSessionFactory = (_gainPercent, _settings, callbacks) => {
      telemetryCallback = callbacks.onTelemetry;
      return makeAudioSessionPort();
    };
    const manager = makeManager(() => 200, createAudioSession);

    await manager.startSession(makeStartPayload(4, 260, "telemetry.example"));
    runtimeSendMessage.mockClear();
    telemetryCallback?.({
      level: 0.9123,
      warning: "danger",
      metrics: {
        protectorActionDb: 7.4,
        clipEvents: 3,
        clipPeak: 1.12,
        protectionBypassed: true,
        inputPeak: 0.88,
        outputPeak: 0.79,
        normalizationInputLoudnessDb: null,
        normalizationAppliedGainDb: 0,
        normalizationOffsetScore: 0,
        normalizationAction: "holding",
        normalizationLoadPercent: 0
      }
    });

    expect(manager.getSnapshot()[0]).toMatchObject({
      tabId: 4,
      level: 0.9123,
      warning: "danger",
      protectorActionDb: 7.4,
      clipEvents: 3,
      clipPeak: 1.12,
      protectionBypassed: true,
      outputPeak: 0.79
    });
    expect(runtimeSendMessage).toHaveBeenCalledWith({
      type: "SESSION_LEVEL_UPDATE",
      payload: {
        tabId: 4,
        level: 0.9123,
        warning: "danger",
        protectorActionDb: 7.4,
        clipEvents: 3,
        clipPeak: 1.12,
        protectionBypassed: true,
        outputPeak: 0.79
      }
    });
  });

  it("ignores late telemetry after a session was already removed", async () => {
    const telemetryCallbacks: Array<(payload: Parameters<Parameters<AudioSessionFactory>[2]["onTelemetry"]>[0]) => void> = [];

    const createAudioSession: AudioSessionFactory = (_gainPercent, _settings, callbacks) => {
      telemetryCallbacks.push(callbacks.onTelemetry);
      return makeAudioSessionPort();
    };

    const manager = makeManager(() => 300, createAudioSession);

    await manager.startSession(makeStartPayload(5, 200, "late.example"));
    runtimeSendMessage.mockClear();
    await manager.stopSession(5);
    runtimeSendMessage.mockClear();

    telemetryCallbacks[0]({
      level: 0.9,
      warning: "danger",
      metrics: {
        protectorActionDb: 8,
        clipEvents: 2,
        clipPeak: 1,
        protectionBypassed: false,
        inputPeak: 0.8,
        outputPeak: 0.75,
        normalizationInputLoudnessDb: null,
        normalizationAppliedGainDb: 0,
        normalizationOffsetScore: 0,
        normalizationAction: "holding",
        normalizationLoadPercent: 0
      }
    });

    expect(runtimeSendMessage).not.toHaveBeenCalled();
  });

  it("applies advanced settings to every active session without restarting capture", async () => {
    const firstSession = makeAudioSessionPort();
    const secondSession = makeAudioSessionPort();
    const createAudioSession: AudioSessionFactory = vi
      .fn()
      .mockReturnValueOnce(firstSession)
      .mockReturnValueOnce(secondSession);
    const manager = makeManager(() => 400, createAudioSession);
    const nextSettings = {
      ...DEFAULT_ADVANCED_AUDIO_SETTINGS,
      qualityPreset: "maximum_loudness" as const,
      ceilingDb: -0.8,
      lookaheadMs: 3,
      releaseMs: 120,
      multibandDepth: 62,
      softClipMix: 28
    };

    await manager.startSession(makeStartPayload(1, 220, "one.example"));
    await manager.startSession(makeStartPayload(2, 180, "two.example"));
    const response = await manager.setAdvancedAudioSettings(nextSettings);

    expect(firstSession.setAdvancedAudioSettings).toHaveBeenCalledWith(nextSettings);
    expect(secondSession.setAdvancedAudioSettings).toHaveBeenCalledWith(nextSettings);
    expect(response).toEqual({
      ok: true,
      data: {
        sessions: [
          expect.objectContaining({
            tabId: 1,
            warning: "none",
            protectorActionDb: 0,
            clipEvents: 0,
            clipPeak: 0,
            protectionBypassed: false,
            outputPeak: 0
          }),
          expect.objectContaining({
            tabId: 2,
            warning: "none",
            protectorActionDb: 0,
            clipEvents: 0,
            clipPeak: 0,
            protectionBypassed: false,
            outputPeak: 0
          })
        ]
      }
    });
    expect(manager.getSnapshot()).toEqual([
      expect.objectContaining({
        tabId: 1,
        warning: "none",
        protectorActionDb: 0,
        clipEvents: 0,
        clipPeak: 0,
        protectionBypassed: false,
        outputPeak: 0
      }),
      expect.objectContaining({
        tabId: 2,
        warning: "none",
        protectorActionDb: 0,
        clipEvents: 0,
        clipPeak: 0,
        protectionBypassed: false,
        outputPeak: 0
      })
    ]);
  });

  it("returns a failure when changing gain or metadata for a missing session", async () => {
    const manager = makeManager(() => 500, () => makeAudioSessionPort());

    await expect(manager.setGain(999, 180)).resolves.toMatchObject({
      ok: false,
      errorMessage: { key: "errorNoRunningSession" }
    });
    await expect(
      manager.updateMetadata({
        tabId: 999,
        title: "Missing",
        url: "https://missing.example/video",
        domain: "missing.example"
      })
    ).resolves.toMatchObject({
      ok: false,
      errorMessage: { key: "errorNoRunningSession" }
    });
  });

  it("updates metadata, gain and protection mode without restarting the session", async () => {
    const audioSession = makeAudioSessionPort();
    const manager = makeManager(() => 600, () => audioSession);
    const nextSettings = {
      ...DEFAULT_ADVANCED_AUDIO_SETTINGS,
      qualityProtectorMode: "off" as const
    };

    await manager.startSession(makeStartPayload(4, 160, "demo.example"));
    const response = await manager.updateMetadata({
      tabId: 4,
      title: "Updated title",
      url: "https://changed.example/watch",
      domain: "changed.example",
      favIconUrl: "https://changed.example/icon.ico",
      gainPercent: 280,
      advancedAudioSettings: nextSettings
    });

    expect(response).toEqual({
      ok: true,
      data: {
        sessions: [
          expect.objectContaining({
            tabId: 4,
            title: "Updated title",
            url: "https://changed.example/watch",
            domain: "changed.example",
            favIconUrl: "https://changed.example/icon.ico",
            gainPercent: 280,
            protectionBypassed: true
          })
        ]
      }
    });
    expect(audioSession.setGainPercent).toHaveBeenCalledWith(280);
    expect(audioSession.setAdvancedAudioSettings).toHaveBeenCalledWith(nextSettings);
    expect(manager.getSnapshot()[0]).toMatchObject({
      title: "Updated title",
      domain: "changed.example",
      gainPercent: 280,
      protectionBypassed: true
    });
  });

  it("skips gain and advanced-setting rewrites when metadata keeps the same processing config", async () => {
    const audioSession = makeAudioSessionPort();
    const manager = makeManager(() => 605, () => audioSession);

    await manager.startSession(makeStartPayload(8, 160, "same.example"));
    audioSession.setGainPercent.mockClear();
    audioSession.setAdvancedAudioSettings.mockClear();

    const response = await manager.updateMetadata({
      tabId: 8,
      title: "Same title",
      url: "https://same.example/watch",
      domain: "same.example",
      gainPercent: 160
    });

    expect(response).toMatchObject({ ok: true });
    expect(audioSession.setGainPercent).not.toHaveBeenCalled();
    expect(audioSession.setAdvancedAudioSettings).not.toHaveBeenCalled();
  });

  it("stops every running session when asked to stop all", async () => {
    const firstSession = makeAudioSessionPort();
    const secondSession = makeAudioSessionPort();
    const createAudioSession: AudioSessionFactory = vi
      .fn()
      .mockReturnValueOnce(firstSession)
      .mockReturnValueOnce(secondSession);
    const manager = makeManager(() => 700, createAudioSession);

    await manager.startSession(makeStartPayload(1, 220, "one.example"));
    await manager.startSession(makeStartPayload(2, 180, "two.example"));
    const response = await manager.stopAll();

    expect(response).toMatchObject({
      ok: true,
      data: { sessions: [] }
    });
    expect(firstSession.stop).toHaveBeenCalledTimes(1);
    expect(secondSession.stop).toHaveBeenCalledTimes(1);
  });

  it("publishes the exact inactive status payload when a session stops", async () => {
    const audioSession = makeAudioSessionPort();
    const manager = makeManager(() => 720, () => audioSession);

    await manager.startSession(makeStartPayload(11, 310, "stop.example"));
    runtimeSendMessage.mockClear();

    const response = await manager.stopSession(11);

    expect(response).toEqual({ ok: true, data: { sessions: [] } });
    expect(runtimeSendMessage).toHaveBeenCalledWith({
      type: "SESSION_STATUS_UPDATE",
      payload: {
        tabId: 11,
        streamState: "inactive",
        engineStatus: "ready",
        gainPercent: 310
      }
    });
  });

  it("publishes exact status updates when gain and metadata change on a running session", async () => {
    const audioSession = makeAudioSessionPort();
    const manager = makeManager(() => 730, () => audioSession);

    await manager.startSession(makeStartPayload(12, 200, "gain.example"));
    runtimeSendMessage.mockClear();

    await expect(manager.setGain(12, 340)).resolves.toEqual({
      ok: true,
      data: {
        sessions: [
          expect.objectContaining({
            tabId: 12,
            gainPercent: 340,
            streamState: "active",
            engineStatus: "ready",
            protectorActionDb: 0,
            clipEvents: 0,
            clipPeak: 0,
            outputPeak: 0
          })
        ]
      }
    });
    expect(runtimeSendMessage).toHaveBeenCalledWith({
      type: "SESSION_STATUS_UPDATE",
      payload: {
        tabId: 12,
        streamState: "active",
        engineStatus: "ready",
        gainPercent: 340,
        lastError: undefined
      }
    });

    runtimeSendMessage.mockClear();
    await expect(
      manager.updateMetadata({
        tabId: 12,
        title: "Retitled",
        url: "https://gain.example/new",
        domain: "gain.example",
        favIconUrl: "https://gain.example/icon.ico"
      })
    ).resolves.toEqual({
      ok: true,
      data: {
        sessions: [
          expect.objectContaining({
            tabId: 12,
            title: "Retitled",
            url: "https://gain.example/new",
            domain: "gain.example",
            favIconUrl: "https://gain.example/icon.ico",
            gainPercent: 340
          })
        ]
      }
    });

    expect(runtimeSendMessage).toHaveBeenCalledWith({
      type: "SESSION_STATUS_UPDATE",
      payload: {
        tabId: 12,
        streamState: "active",
        engineStatus: "ready",
        gainPercent: 340,
        lastError: undefined
      }
    });
  });

  it("keeps stopSession and stopAll silent when the target session does not exist", async () => {
    const manager = makeManager(() => 740, () => makeAudioSessionPort());

    await expect(manager.stopSession(999)).resolves.toEqual({ ok: true, data: { sessions: [] } });
    await expect(manager.stopAll()).resolves.toEqual({ ok: true, data: { sessions: [] } });
    expect(runtimeSendMessage).not.toHaveBeenCalled();
  });

  it("swallows runtime messaging errors while keeping session state updates successful", async () => {
    const audioSession = makeAudioSessionPort();
    const manager = makeManager(() => 710, () => audioSession);

    runtimeSendMessage.mockReturnValueOnce(Promise.resolve(undefined));
    runtimeSendMessage.mockImplementation(() => {
      throw new Error("worker asleep");
    });

    const response = await manager.startSession(makeStartPayload(6, 220, "notify.example"));

    expect(response).toMatchObject({ ok: true });
    expect(manager.getSnapshot()[0]).toMatchObject({
      tabId: 6,
      streamState: "active",
      engineStatus: "ready"
    });
  });

  it("attaches and swallows promise catches only when runtime.sendMessage returns a catchable promise", async () => {
    const catchSpy = vi.fn(() => Promise.resolve(undefined));
    const manager = makeManager(() => 715, () => makeAudioSessionPort());

    runtimeSendMessage.mockReset();
    runtimeSendMessage.mockReturnValueOnce({ catch: catchSpy });

    await manager.startSession(makeStartPayload(7, 210, "promise.example"));

    expect(catchSpy).toHaveBeenCalledTimes(1);

    runtimeSendMessage.mockReset();
    runtimeSendMessage.mockReturnValueOnce(undefined);

    await expect(manager.stopSession(7)).resolves.toEqual({ ok: true, data: { sessions: [] } });
  });

  it("marks a running session as errored on fatal callbacks and ignores repeated fatals", async () => {
    const audioSession = makeAudioSessionPort();
    let onFatalError:
      | ((errorMessage: NonNullable<CaptureSessionState["lastError"]>) => void)
      | undefined;

    const manager = makeManager(() => 900, (_gainPercent, _settings, callbacks) => {
      onFatalError = callbacks.onFatalError;
      return audioSession;
    });

    await manager.startSession(makeStartPayload(21, 220, "fatal.example"));
    runtimeSendMessage.mockClear();

    onFatalError?.(message("errorAudioPipelineStart"));
    await vi.waitFor(() => {
      expect(audioSession.stop).toHaveBeenCalledTimes(1);
    });

    expect(manager.getSnapshot()[0]).toMatchObject({
      tabId: 21,
      streamState: "error",
      engineStatus: "error",
      warning: "danger",
      lastError: message("errorAudioPipelineStart")
    });
    expect(runtimeSendMessage).toHaveBeenCalledWith({
      type: "SESSION_STATUS_UPDATE",
      payload: {
        tabId: 21,
        streamState: "error",
        engineStatus: "error",
        gainPercent: 220,
        lastError: message("errorAudioPipelineStart")
      }
    });

    runtimeSendMessage.mockClear();
    onFatalError?.(message("errorAudioPipelineStart"));
    await Promise.resolve();
    expect(audioSession.stop).toHaveBeenCalledTimes(1);
    expect(runtimeSendMessage).not.toHaveBeenCalled();
  });

  it("swallows rejected runtime promises and ignores late fatal callbacks after teardown", async () => {
    const audioSession = makeAudioSessionPort();
    let onFatalError:
      | ((errorMessage: NonNullable<CaptureSessionState["lastError"]>) => void)
      | undefined;

    runtimeSendMessage.mockImplementation(() => Promise.reject(new Error("sleeping worker")));

    const manager = makeManager(() => 910, (_gainPercent, _settings, callbacks) => {
      onFatalError = callbacks.onFatalError;
      return audioSession;
    });

    await expect(manager.startSession(makeStartPayload(22, 180, "late-fatal.example"))).resolves.toMatchObject({
      ok: true
    });
    await expect(manager.stopSession(22)).resolves.toEqual({ ok: true, data: { sessions: [] } });

    onFatalError?.(message("errorAudioPipelineStart"));
    await Promise.resolve();
    expect(manager.getSnapshot()).toEqual([]);
    expect(audioSession.stop).toHaveBeenCalledTimes(1);
  });
});
