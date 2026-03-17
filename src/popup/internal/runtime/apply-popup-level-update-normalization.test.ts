import { expect, test } from "vitest";
import { applyPopupLevelUpdate } from "./apply-popup-level-update";
import { makePopupMainSession } from "../../test-support/make-popup-main-session";
import { makePopupMainState } from "../../test-support/make-popup-main-state";

test("copies live normalization telemetry into the popup session state", () => {
  const state = {
    currentState: makePopupMainState({
      sessions: [makePopupMainSession()]
    })
  };

  expect(
    applyPopupLevelUpdate(state as never, {
      tabId: 91,
      level: 0.91,
      warning: "danger",
      protectorActionDb: 3.4,
      clipEvents: 2,
      clipPeak: 1.2,
      protectionBypassed: false,
      outputPeak: 0.97,
      normalizationInputLoudnessDb: -27.4,
      normalizationAppliedGainDb: 4.2,
      normalizationOffsetScore: -36,
      normalizationAction: "raising",
      normalizationLoadPercent: 35
    })
  ).toBe(true);
  expect(state.currentState.sessions[0]).toMatchObject({
    normalizationInputLoudnessDb: -27.4,
    normalizationAppliedGainDb: 4.2,
    normalizationOffsetScore: -36,
    normalizationAction: "raising",
    normalizationLoadPercent: 35
  });
});
