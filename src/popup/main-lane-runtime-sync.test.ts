// @vitest-environment happy-dom

import { createPopupMainHarness } from "./test-support/create-popup-main-harness";
import { flushPopupMainMicrotasks } from "./test-support/flush-popup-main-microtasks";
import { makePopupMainState } from "./test-support/make-popup-main-state";

test("syncs lane status and lane actions after worker state updates", async () => {
  const harness = createPopupMainHarness();
  harness.sendMessageSafeMock.mockImplementation(async (command: { type: string }) => {
    if (command.type === "GET_STATE") {
      return {
        ok: true,
        data: makePopupMainState({
          currentTab: {
            tabId: 7,
            title: "Video",
            url: "https://video.example",
            domain: "video.example",
            supported: true,
            preferredGainPercent: 100,
            hasStoredPreference: false,
            autoAttachState: "idle"
          },
          hasGlobalPermission: true
        })
      };
    }

    return { ok: true, data: null };
  });

  await harness.importPopupMain();

  expect(document.querySelector<HTMLElement>("[data-role='lane-status-heading']")?.textContent).not.toBe("");
  expect(document.querySelector<HTMLButtonElement>("[data-role='toggle-global-auto']")?.dataset.action).toBe(
    "enable-global-auto"
  );

  harness.getRuntimeMessageListener()?.({
    type: "WORKER_STATE_UPDATE",
    payload: makePopupMainState({
      currentTab: {
        tabId: 7,
        title: "Video",
        url: "https://video.example",
        domain: "video.example",
        supported: true,
        preferredGainPercent: 100,
        hasStoredPreference: false,
        autoAttachState: "idle"
      },
      hasGlobalPermission: false
    })
  });
  await flushPopupMainMicrotasks();

  expect(document.querySelector<HTMLElement>("[data-role='lane-status-heading']")?.textContent).not.toBe("");
  expect(document.querySelector<HTMLButtonElement>("[data-role='toggle-site-auto']")?.disabled).toBe(false);
  expect(document.querySelector<HTMLButtonElement>("[data-role='toggle-global-auto']")?.dataset.action).toBe(
    "request-global-auto-permission"
  );

  vi.useRealTimers();
  vi.unstubAllGlobals();
});
