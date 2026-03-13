// @vitest-environment happy-dom

import { expect, test, vi } from "vitest";
import { createPopupRuntimeState } from "../runtime/create-popup-runtime-state";

const mockedCommandModules = vi.hoisted(() => ({
  handlePopupWorkerResponse: vi.fn(),
  sendMessageSafe: vi.fn(),
  syncPopupSessionBoostBundle: vi.fn()
}));

vi.mock("../../../shared/messages", () => ({ sendMessageSafe: mockedCommandModules.sendMessageSafe }));
vi.mock("./handle-popup-worker-response", () => ({
  handlePopupWorkerResponse: mockedCommandModules.handlePopupWorkerResponse
}));
vi.mock("./sync-popup-session-boost-bundle", () => ({
  syncPopupSessionBoostBundle: mockedCommandModules.syncPopupSessionBoostBundle
}));

import { resetPopupSessionBoostOnAllSites } from "./reset-popup-session-boost-on-all-sites";

test("syncs the popup session boost bundle before sending RESET_SESSION_BOOST_ON_ALL_SITES", async () => {
  document.body.innerHTML = '<div id="app"></div>';
  const rootElement = document.querySelector<HTMLDivElement>("#app");

  if (!rootElement) {
    throw new Error("Missing popup root element.");
  }

  const state = createPopupRuntimeState();
  const context = {
    refs: { document, rootElement, settingsRepository: { getPopupTheme: vi.fn(), setPopupTheme: vi.fn() }, window },
    state
  };
  const response = { ok: true, data: {} } as never;

  mockedCommandModules.syncPopupSessionBoostBundle.mockResolvedValueOnce(false);
  await resetPopupSessionBoostOnAllSites(context, 7);
  expect(mockedCommandModules.sendMessageSafe).not.toHaveBeenCalled();

  vi.clearAllMocks();
  mockedCommandModules.syncPopupSessionBoostBundle.mockResolvedValueOnce(true);
  mockedCommandModules.sendMessageSafe.mockResolvedValueOnce(response);
  mockedCommandModules.handlePopupWorkerResponse.mockResolvedValueOnce(undefined);
  await resetPopupSessionBoostOnAllSites(context, 7);
  expect(mockedCommandModules.syncPopupSessionBoostBundle).toHaveBeenCalledWith(context, 7);
  expect(mockedCommandModules.sendMessageSafe).toHaveBeenCalledWith({
    type: "RESET_SESSION_BOOST_ON_ALL_SITES",
    payload: { tabId: 7 }
  });
  expect(mockedCommandModules.handlePopupWorkerResponse).toHaveBeenCalledWith({
    ...context,
    response
  });
});
