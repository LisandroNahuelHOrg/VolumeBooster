// @vitest-environment happy-dom

import { createPopupMainHarness } from "./test-support/create-popup-main-harness";
import { flushPopupMainMicrotasks } from "./test-support/flush-popup-main-microtasks";
import { makePopupMainSession } from "./test-support/make-popup-main-session";
import { makePopupMainState } from "./test-support/make-popup-main-state";

test("refreshes live telemetry and session card content across level and status pushes", async () => {
  const harness = createPopupMainHarness();
  harness.sendMessageSafeMock.mockImplementation(async (command: { type: string }) => {
    if (command.type === "GET_STATE") {
      return {
        ok: true,
        data: makePopupMainState({
          currentTab: {
            tabId: 91,
            title: "Focus Stream",
            url: "https://example.com/watch",
            domain: "example.com",
            supported: true,
            preferredGainPercent: 175,
            hasStoredPreference: false,
            activeLane: "manual_tab_capture",
            autoAttachState: "idle"
          },
          sessions: [makePopupMainSession()]
        })
      };
    }

    return { ok: true, data: null };
  });

  await harness.importPopupMain();
  vi.advanceTimersByTime(100);

  harness.getRuntimeMessageListener()?.({
    type: "SESSION_LEVEL_UPDATE",
    payload: {
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
    }
  });
  await flushPopupMainMicrotasks();

  expect(document.querySelector<HTMLElement>("[data-role='warning-pill']")?.dataset.warning).toBe("danger");
  expect(document.querySelector<HTMLElement>("[data-role='clip-events-value']")?.textContent).toBe("2");
  expect(document.querySelector<HTMLElement>("[data-role='session-meter-fill']")?.style.width).not.toBe("");
  expect(document.querySelector<HTMLElement>("[data-role='normalization-offset-value']")?.textContent).toBe("-36");
  expect(document.querySelector<HTMLElement>("[data-role='normalization-correction-value']")?.textContent).toBe(
    "+4.2 dB"
  );
  expect(document.querySelector<HTMLElement>("[data-role='normalization-action-value']")?.textContent).toBe(
    "Raising"
  );
  expect(document.querySelector<HTMLElement>("[data-role='normalization-load-value']")?.textContent).toBe("35%");
  expect(document.querySelector<HTMLElement>("[data-role='normalization-offset-thumb']")?.style.left).toBe("32%");

  harness.getRuntimeMessageListener()?.({
    type: "SESSION_STATUS_UPDATE",
    payload: {
      tabId: 91,
      streamState: "error",
      engineStatus: "error",
      gainPercent: 220,
      lastError: { key: "errorExtensionActionFailed" }
    }
  });
  await flushPopupMainMicrotasks();

  expect(document.querySelector<HTMLElement>(".session-card__status-dot")?.dataset.state).toBe("error");
  expect(document.querySelector<HTMLElement>("[data-role='session-gain']")?.textContent).toBe("220%");

  vi.useRealTimers();
  vi.unstubAllGlobals();
});
