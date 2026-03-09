import { DEFAULT_ADVANCED_AUDIO_SETTINGS } from "../shared/audio-settings";
import {
  BRIDGE_COMMAND_EVENT,
  BRIDGE_SOURCE,
  BRIDGE_STATUS_EVENT,
  BRIDGE_TELEMETRY_EVENT,
  createBridgeCommandEvent,
  createBridgeDefaultMetrics,
  createBridgeStatusEvent,
  createBridgeTelemetryEvent,
  isBridgeEventDetail
} from "./bridge-protocol";

describe("bridge-protocol", () => {
  it("creates command, status, and telemetry events with the fixed bridge source", () => {
    const configurePayload = {
      type: "configure" as const,
      payload: {
        tabId: 7,
        scope: "site" as const,
        enabled: true,
        suspended: false,
        gainPercent: 250,
        advancedAudioSettings: { ...DEFAULT_ADVANCED_AUDIO_SETTINGS }
      }
    };
    const statusPayload = {
      enabled: true,
      suspended: false,
      scope: "site" as const,
      attachState: "attached" as const,
      activeStrategy: "web_audio_bridge" as const,
      audioContextState: "running" as const,
      audioContextCount: 1,
      attachedNodeCount: 2,
      currentUrl: "https://example.com"
    };
    const telemetryPayload = {
      activeStrategy: "web_audio_bridge" as const,
      level: 0.82,
      warning: "high" as const,
      metrics: createBridgeDefaultMetrics(true),
      audioContextCount: 2,
      attachedNodeCount: 3,
      lastTelemetryAt: 123
    };

    const commandEvent = createBridgeCommandEvent(configurePayload);
    const statusEvent = createBridgeStatusEvent(statusPayload);
    const telemetryEvent = createBridgeTelemetryEvent(telemetryPayload);

    expect(commandEvent.type).toBe(BRIDGE_COMMAND_EVENT);
    expect(commandEvent.detail).toEqual({
      source: BRIDGE_SOURCE,
      payload: configurePayload
    });
    expect(statusEvent.type).toBe(BRIDGE_STATUS_EVENT);
    expect(statusEvent.detail).toEqual({
      source: BRIDGE_SOURCE,
      payload: statusPayload
    });
    expect(telemetryEvent.type).toBe(BRIDGE_TELEMETRY_EVENT);
    expect(telemetryEvent.detail).toEqual({
      source: BRIDGE_SOURCE,
      payload: telemetryPayload
    });
  });

  it("accepts only valid bridge event details", () => {
    expect(isBridgeEventDetail({ source: BRIDGE_SOURCE, payload: { ok: true } })).toBe(true);
    expect(isBridgeEventDetail(null)).toBe(false);
    expect(isBridgeEventDetail(undefined)).toBe(false);
    expect(isBridgeEventDetail({ source: "other", payload: {} })).toBe(false);
    expect(isBridgeEventDetail({ source: BRIDGE_SOURCE })).toBe(false);
    expect(isBridgeEventDetail({ payload: {} })).toBe(false);
    expect(isBridgeEventDetail("bad")).toBe(false);
  });

  it("creates default bridge metrics with optional bypass state", () => {
    expect(createBridgeDefaultMetrics()).toEqual({
      protectorActionDb: 0,
      clipEvents: 0,
      clipPeak: 0,
      protectionBypassed: false,
      outputPeak: 0
    });
    expect(createBridgeDefaultMetrics(true)).toEqual({
      protectorActionDb: 0,
      clipEvents: 0,
      clipPeak: 0,
      protectionBypassed: true,
      outputPeak: 0
    });
  });
});
