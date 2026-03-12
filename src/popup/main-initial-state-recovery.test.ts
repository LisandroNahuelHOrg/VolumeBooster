// @vitest-environment happy-dom

import { createPopupMainDeferred } from "./test-support/create-popup-main-deferred";
import { createPopupMainHarness } from "./test-support/create-popup-main-harness";
import { flushPopupMainMicrotasks } from "./test-support/flush-popup-main-microtasks";
import { makePopupMainState } from "./test-support/make-popup-main-state";
import { makePopupMainSession } from "./test-support/make-popup-main-session";

test("keeps the popup ready when a worker snapshot arrives before the initial GET_STATE settles", async () => {
  const harness = createPopupMainHarness();
  const deferredState = createPopupMainDeferred<{
    ok: boolean;
    data: null;
    errorMessage?: { key: string };
  }>();

  harness.sendMessageSafeMock.mockImplementation((command: { type: string }) => {
    if (command.type === "GET_STATE") {
      return deferredState.promise;
    }

    return Promise.resolve({ ok: true, data: null });
  });

  await harness.importPopupMain();
  const runtimeMessageListener = harness.getRuntimeMessageListener();

  if (!runtimeMessageListener) {
    throw new Error("Popup runtime listener was not registered.");
  }

  runtimeMessageListener({
    type: "WORKER_STATE_UPDATE",
    payload: makePopupMainState({
      currentTab: {
        tabId: 12,
        title: "Current Tab",
        url: "https://example.com/watch",
        domain: "example.com",
        supported: true,
        preferredGainPercent: 180,
        hasStoredPreference: false,
        activeLane: "manual_tab_capture",
        autoAttachState: "idle"
      },
      sessions: [makePopupMainSession({ tabId: 12, gainPercent: 180 })]
    })
  });
  await flushPopupMainMicrotasks();

  expect(document.querySelector("[data-popup-toolbar]")).not.toBeNull();
  expect(document.querySelector(".hero__eyebrow")).toBeNull();

  deferredState.resolve({ ok: false, data: null, errorMessage: { key: "errorGetState" } });
  await flushPopupMainMicrotasks();

  expect(document.querySelector("[data-popup-toolbar]")).not.toBeNull();
  expect(document.querySelector(".hero__eyebrow")).toBeNull();

  vi.useRealTimers();
  vi.unstubAllGlobals();
});
