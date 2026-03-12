// @vitest-environment happy-dom

import { createPopupMainHarness } from "./test-support/create-popup-main-harness";
import { flushPopupMainMicrotasks } from "./test-support/flush-popup-main-microtasks";
import { makePopupMainState } from "./test-support/make-popup-main-state";

test("chains REQUEST_GLOBAL_PERMISSION into ENABLE_GLOBAL_AUTO_BOOSTER when the current tab becomes recoverable", async () => {
  const harness = createPopupMainHarness();
  const currentTab = {
    tabId: 7,
    title: "Video",
    url: "https://video.example",
    domain: "video.example",
    supported: true,
    preferredGainPercent: 100,
    hasStoredPreference: false,
    autoAttachState: "idle" as const
  };
  const initialState = makePopupMainState({
    currentTab,
    hasGlobalPermission: false,
    autoBoosterMode: "off"
  });
  const permissionState = makePopupMainState({
    currentTab,
    hasGlobalPermission: true,
    autoBoosterMode: "off"
  });
  const enabledState = makePopupMainState({
    currentTab: {
      ...currentTab,
      autoBoosterScope: "global"
    },
    hasGlobalPermission: true,
    autoBoosterMode: "global"
  });

  harness.sendMessageSafeMock.mockImplementation(async (command: { type: string; payload?: unknown }) => {
    if (command.type === "GET_STATE") {
      return { ok: true, data: initialState };
    }

    if (command.type === "REQUEST_GLOBAL_PERMISSION") {
      return { ok: true, data: permissionState };
    }

    if (command.type === "ENABLE_GLOBAL_AUTO_BOOSTER") {
      return { ok: true, data: enabledState };
    }

    return { ok: true, data: null };
  });

  await harness.importPopupMain();

  document.querySelector<HTMLButtonElement>("[data-role='toggle-global-auto']")?.click();
  await flushPopupMainMicrotasks();

  expect(harness.sendMessageSafeMock).toHaveBeenNthCalledWith(2, {
    type: "REQUEST_GLOBAL_PERMISSION"
  });
  expect(harness.sendMessageSafeMock).toHaveBeenNthCalledWith(3, {
    type: "ENABLE_GLOBAL_AUTO_BOOSTER",
    payload: { tabId: 7, gainPercent: 100 }
  });
  expect(document.querySelector<HTMLButtonElement>("[data-role='toggle-global-auto']")?.dataset.action).toBe(
    "disable-global-auto"
  );

  vi.useRealTimers();
  vi.unstubAllGlobals();
});
