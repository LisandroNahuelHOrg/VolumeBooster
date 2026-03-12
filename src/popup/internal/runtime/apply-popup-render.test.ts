// @vitest-environment happy-dom

import { expect, test, vi } from "vitest";
import { loadLocaleCatalog, t, translate } from "../../../shared/runtime-i18n";
import { makePopupMainState } from "../../test-support/make-popup-main-state";
import { applyPopupRender } from "./apply-popup-render";
import { createPopupRuntimeState } from "./create-popup-runtime-state";

test("renders loading, error, and ready shells from the explicit initial state status", async () => {
  document.body.innerHTML = '<div id="app"></div>';
  vi.stubGlobal("requestAnimationFrame", ((callback: FrameRequestCallback) => {
    callback(0);
    return 1;
  }) as typeof requestAnimationFrame);
  vi.stubGlobal("cancelAnimationFrame", vi.fn());
  Element.prototype.animate = vi.fn(() => ({
    cancel: vi.fn(),
    finished: Promise.resolve(),
    pause: vi.fn(),
    play: vi.fn()
  })) as unknown as typeof Element.prototype.animate;
  const rootElement = document.querySelector<HTMLDivElement>("#app");

  if (!rootElement) {
    throw new Error("Missing popup root element.");
  }

  const refs = {
    document,
    rootElement,
    settingsRepository: { getPopupTheme: vi.fn(), setPopupTheme: vi.fn() },
    window
  };
  const catalog = await loadLocaleCatalog("en");
  const state = createPopupRuntimeState();

  state.currentCatalog = catalog;
  state.initialStateStatus = "pending";
  applyPopupRender(refs, state);
  expect(document.querySelector(".hero__subtitle")?.textContent?.trim()).toBe(t("loadingLabel"));
  expect(document.querySelector(".chip")).toBeNull();

  state.initialStateStatus = "failed";
  state.transientError = { key: "errorGetState" };
  applyPopupRender(refs, state);
  expect(document.querySelector(".chip")?.textContent?.trim()).toBe(translate(catalog, "errorPrefix"));
  expect(document.querySelector(".hero__subtitle")?.textContent?.trim()).toBe(t("errorGetState"));

  state.initialStateStatus = "ready";
  state.currentState = makePopupMainState();
  applyPopupRender(refs, state);
  expect(document.querySelector("[data-popup-toolbar]")).not.toBeNull();

  vi.useRealTimers();
  vi.unstubAllGlobals();
});
