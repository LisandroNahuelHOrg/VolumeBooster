import { expect, test, vi } from "vitest";
import { handleSessionTelemetry } from "./handle-session-telemetry";

test("publishes and stores live normalization telemetry for manual sessions", () => {
  const sendMessage = vi.fn();
  const sessions = new Map([
    [
      7,
      {
        state: {
          level: 0,
          warning: "none",
          protectorActionDb: 0,
          clipEvents: 0,
          clipPeak: 0,
          protectionBypassed: false,
          outputPeak: 0,
          normalizationInputLoudnessDb: null,
          normalizationAppliedGainDb: 0,
          normalizationOffsetScore: 0,
          normalizationAction: "holding",
          normalizationLoadPercent: 0
        }
      }
    ]
  ]);

  vi.stubGlobal("chrome", {
    runtime: {
      sendMessage
    }
  } as unknown as typeof chrome);
  handleSessionTelemetry(sessions as never, 7, {
    level: 0.84,
    warning: "high",
    metrics: {
      protectorActionDb: 2.7,
      clipEvents: 1,
      clipPeak: 0.74,
      protectionBypassed: false,
      inputPeak: 0.66,
      outputPeak: 0.61,
      normalizationInputLoudnessDb: -27.4,
      normalizationAppliedGainDb: 4.2,
      normalizationOffsetScore: -36,
      normalizationAction: "raising",
      normalizationLoadPercent: 35
    }
  });

  expect(sessions.get(7)?.state).toMatchObject({
    normalizationInputLoudnessDb: -27.4,
    normalizationAppliedGainDb: 4.2,
    normalizationOffsetScore: -36,
    normalizationAction: "raising",
    normalizationLoadPercent: 35
  });
  expect(sendMessage).toHaveBeenCalledWith({
    type: "SESSION_LEVEL_UPDATE",
    payload: {
      tabId: 7,
      level: 0.84,
      warning: "high",
      protectorActionDb: 2.7,
      clipEvents: 1,
      clipPeak: 0.74,
      protectionBypassed: false,
      outputPeak: 0.61,
      normalizationInputLoudnessDb: -27.4,
      normalizationAppliedGainDb: 4.2,
      normalizationOffsetScore: -36,
      normalizationAction: "raising",
      normalizationLoadPercent: 35
    }
  });
  vi.unstubAllGlobals();
});
