// @vitest-environment happy-dom

import { createPopupMainHarness } from "./test-support/create-popup-main-harness";
import { flushPopupMainMicrotasks } from "./test-support/flush-popup-main-microtasks";
import { getPopupSessionMeterFill } from "./test-support/get-popup-session-meter-fill";
import { makePopupMainSession } from "./test-support/make-popup-main-session";
import { makePopupMainState } from "./test-support/make-popup-main-state";

describe("popup main session meter", () => {
  let harness: ReturnType<typeof createPopupMainHarness>;

  beforeEach(() => {
    harness = createPopupMainHarness();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it("clamps session meter width for invalid and out-of-range telemetry updates", async () => {
    harness.sendMessageSafeMock.mockImplementation(async (command: { type: string }) => {
      if (command.type === "GET_STATE") {
        return {
          ok: true,
          data: makePopupMainState({
            sessions: [makePopupMainSession({ level: 1.4 })]
          })
        };
      }

      return {
        ok: true,
        data: null
      };
    });

    await harness.importPopupMain();

    expect(getPopupSessionMeterFill().style.width).toBe("100%");

    harness.getRuntimeMessageListener()?.({
      type: "SESSION_LEVEL_UPDATE",
      payload: {
        tabId: 91,
        level: Number.NaN,
        warning: "none",
        protectorActionDb: 0,
        clipEvents: 0,
        clipPeak: 0,
        protectionBypassed: false,
        outputPeak: 0
      }
    });
    await flushPopupMainMicrotasks();

    expect(getPopupSessionMeterFill().style.width).toBe("0%");

    harness.getRuntimeMessageListener()?.({
      type: "SESSION_LEVEL_UPDATE",
      payload: {
        tabId: 91,
        level: -0.2,
        warning: "none",
        protectorActionDb: 0,
        clipEvents: 0,
        clipPeak: 0,
        protectionBypassed: false,
        outputPeak: 0
      }
    });
    await flushPopupMainMicrotasks();

    expect(getPopupSessionMeterFill().style.width).toBe("0%");

    harness.getRuntimeMessageListener()?.({
      type: "SESSION_LEVEL_UPDATE",
      payload: {
        tabId: 91,
        level: 0.02,
        warning: "none",
        protectorActionDb: 0,
        clipEvents: 0,
        clipPeak: 0,
        protectionBypassed: false,
        outputPeak: 0.02
      }
    });
    await flushPopupMainMicrotasks();

    expect(getPopupSessionMeterFill().style.width).toBe("8%");
  });
});
