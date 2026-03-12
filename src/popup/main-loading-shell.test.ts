// @vitest-environment happy-dom

import { t } from "../shared/runtime-i18n";
import { createPopupMainDeferred } from "./test-support/create-popup-main-deferred";
import { createPopupMainHarness } from "./test-support/create-popup-main-harness";

test("renders the loading shell while the initial GET_STATE request is still pending", async () => {
  const harness = createPopupMainHarness();
  const deferredState = createPopupMainDeferred<{
    ok: boolean;
    data: null;
  }>();

  harness.sendMessageSafeMock.mockImplementation((command: { type: string }) => {
    if (command.type === "GET_STATE") {
      return deferredState.promise;
    }

    return Promise.resolve({ ok: true, data: null });
  });

  await harness.importPopupMain();

  expect(document.querySelector(".app-shell")).not.toBeNull();
  expect(document.querySelector(".hero__subtitle")?.textContent?.trim()).toBe(t("loadingLabel"));
  expect(document.querySelector(".hero__eyebrow")).toBeNull();
  expect(document.querySelector(".chip")).toBeNull();
  expect(document.body.textContent).not.toContain(t("tabUnavailable"));
  expect(document.body.textContent).not.toContain(t("errorGetState"));
  expect(document.querySelector("[data-popup-toolbar]")).toBeNull();

  deferredState.resolve({ ok: true, data: null });
  vi.useRealTimers();
  vi.unstubAllGlobals();
});
