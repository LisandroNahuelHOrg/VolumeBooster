// @vitest-environment happy-dom

import { loadLocaleCatalog, t, translate } from "../shared/runtime-i18n";
import { createPopupMainHarness } from "./test-support/create-popup-main-harness";

test("renders the bootstrap error shell when GET_STATE fails without breaking popup theme state", async () => {
  const harness = createPopupMainHarness();
  harness.sendMessageSafeMock.mockImplementation(async (command: { type: string }) => {
    if (command.type === "GET_STATE") {
      return {
        ok: false,
        errorMessage: { key: "errorGetState" },
        data: null
      };
    }

    return { ok: true, data: null };
  });

  await harness.importPopupMain();
  const catalog = await loadLocaleCatalog("en");

  expect(document.documentElement.dataset.popupTheme).toBe("dark");
  expect(document.querySelector(".app-shell")).not.toBeNull();
  expect(document.querySelector(".hero__eyebrow")).not.toBeNull();
  expect(document.querySelector(".chip")?.textContent?.trim()).toBe(translate(catalog, "errorPrefix"));
  expect(document.querySelector(".hero__subtitle")?.textContent?.trim()).toBe(t("errorGetState"));
  expect(document.body.textContent).not.toContain(t("loadingLabel"));
  expect(document.querySelector("[data-popup-toolbar]")).toBeNull();

  vi.useRealTimers();
  vi.unstubAllGlobals();
});
