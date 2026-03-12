// @vitest-environment happy-dom

import { expect, test, vi } from "vitest";
import { STATE_POLL_MS } from "../config/popup-runtime-config";
import { createPopupRuntimeState } from "../runtime/create-popup-runtime-state";
import { startPopupStatePolling } from "./start-popup-state-polling";
import { popupStatePollContextRegistry } from "./popup-state-poll-context-registry";
import { popupStatePollIdRef } from "./popup-state-poll-id-ref";
import { runPopupStatePollTick } from "./run-popup-state-poll-tick";

test("starts silent polling through the named tick handler and registry", () => {
  document.body.innerHTML = '<div id="app"></div>';
  const rootElement = document.querySelector<HTMLDivElement>("#app");

  if (!rootElement) {
    throw new Error("Missing popup root element.");
  }

  popupStatePollContextRegistry.clear();
  popupStatePollIdRef.current = 0;
  const refs = {
    document,
    rootElement,
    settingsRepository: { getPopupTheme: vi.fn(), setPopupTheme: vi.fn() },
    window: {
      ...window,
      setInterval: vi.fn(() => 77)
    } as unknown as Window & typeof globalThis
  };
  const state = createPopupRuntimeState();

  startPopupStatePolling(refs, state);

  expect(refs.window.setInterval).toHaveBeenCalledWith(runPopupStatePollTick, STATE_POLL_MS, 1);
  expect(popupStatePollContextRegistry.get(1)).toEqual({ refs, state });
  expect(state.statePollTimer).toBe(77);
});
