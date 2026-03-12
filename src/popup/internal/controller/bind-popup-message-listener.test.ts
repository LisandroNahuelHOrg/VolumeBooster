// @vitest-environment happy-dom

import { expect, test, vi } from "vitest";
import { createPopupRuntimeState } from "../runtime/create-popup-runtime-state";
import { bindPopupMessageListener } from "./bind-popup-message-listener";
import { handlePopupRuntimeMessage } from "./handle-popup-runtime-message";
import { popupMessageListenerContextRef } from "./popup-message-listener-context-ref";

test("binds the named popup runtime message handler and stores its context", () => {
  document.body.innerHTML = '<div id="app"></div>';
  const rootElement = document.querySelector<HTMLDivElement>("#app");

  if (!rootElement) {
    throw new Error("Missing popup root element.");
  }

  const addListener = vi.fn();
  vi.stubGlobal("chrome", { runtime: { onMessage: { addListener } } });
  const refs = {
    document,
    rootElement,
    settingsRepository: { getPopupTheme: vi.fn(), setPopupTheme: vi.fn() },
    window
  };
  const state = createPopupRuntimeState();

  bindPopupMessageListener(refs, state);

  expect(addListener).toHaveBeenCalledWith(handlePopupRuntimeMessage);
  expect(popupMessageListenerContextRef.current).toEqual({ refs, state });
  vi.unstubAllGlobals();
});
