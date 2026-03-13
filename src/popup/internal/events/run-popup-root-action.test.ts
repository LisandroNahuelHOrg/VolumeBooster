// @vitest-environment happy-dom

import { expect, test, vi } from "vitest";
import { makePopupMainState } from "../../test-support/make-popup-main-state";
import { createPopupRuntimeState } from "../runtime/create-popup-runtime-state";

const mockedCommands = vi.hoisted(() => ({
  applyPopupSessionBoostToAllSites: vi.fn(),
  applyPopupSessionBoostToSite: vi.fn(),
  closePopupSettingsView: vi.fn(),
  disablePopupCurrentTabBooster: vi.fn(),
  disablePopupGlobalAutoBooster: vi.fn(),
  dismissPopupSessionBoostPrompt: vi.fn(),
  enablePopupCurrentTabBooster: vi.fn(),
  enablePopupGlobalAutoBooster: vi.fn(),
  handlePopupThemeToggle: vi.fn(),
  openPopupSettingsView: vi.fn(),
  requestPopupGlobalAutoPermission: vi.fn(),
  resetPopupSessionBoostOnAllSites: vi.fn(),
  resetPopupSessionBoostOnSite: vi.fn(),
  stopPopupSessions: vi.fn(),
  togglePopupCurrentSitePreference: vi.fn()
}));

vi.mock("../commands/apply-popup-session-boost-to-all-sites", () => ({ applyPopupSessionBoostToAllSites: mockedCommands.applyPopupSessionBoostToAllSites }));
vi.mock("../commands/apply-popup-session-boost-to-site", () => ({ applyPopupSessionBoostToSite: mockedCommands.applyPopupSessionBoostToSite }));
vi.mock("../commands/close-popup-settings-view", () => ({ closePopupSettingsView: mockedCommands.closePopupSettingsView }));
vi.mock("../commands/disable-popup-current-tab-booster", () => ({ disablePopupCurrentTabBooster: mockedCommands.disablePopupCurrentTabBooster }));
vi.mock("../commands/disable-popup-global-auto-booster", () => ({ disablePopupGlobalAutoBooster: mockedCommands.disablePopupGlobalAutoBooster }));
vi.mock("../commands/dismiss-popup-session-boost-prompt", () => ({ dismissPopupSessionBoostPrompt: mockedCommands.dismissPopupSessionBoostPrompt }));
vi.mock("../commands/enable-popup-current-tab-booster", () => ({ enablePopupCurrentTabBooster: mockedCommands.enablePopupCurrentTabBooster }));
vi.mock("../commands/enable-popup-global-auto-booster", () => ({ enablePopupGlobalAutoBooster: mockedCommands.enablePopupGlobalAutoBooster }));
vi.mock("../commands/handle-popup-theme-toggle", () => ({ handlePopupThemeToggle: mockedCommands.handlePopupThemeToggle }));
vi.mock("../commands/open-popup-settings-view", () => ({ openPopupSettingsView: mockedCommands.openPopupSettingsView }));
vi.mock("../commands/request-popup-global-auto-permission", () => ({ requestPopupGlobalAutoPermission: mockedCommands.requestPopupGlobalAutoPermission }));
vi.mock("../commands/reset-popup-session-boost-on-all-sites", () => ({ resetPopupSessionBoostOnAllSites: mockedCommands.resetPopupSessionBoostOnAllSites }));
vi.mock("../commands/reset-popup-session-boost-on-site", () => ({ resetPopupSessionBoostOnSite: mockedCommands.resetPopupSessionBoostOnSite }));
vi.mock("../commands/stop-popup-sessions", () => ({ stopPopupSessions: mockedCommands.stopPopupSessions }));
vi.mock("../commands/toggle-popup-current-site-preference", () => ({ togglePopupCurrentSitePreference: mockedCommands.togglePopupCurrentSitePreference }));

import { runPopupRootAction } from "./run-popup-root-action";

test("routes popup root actions through the shared command context", () => {
  document.body.innerHTML = '<div id="app"></div>';
  const rootElement = document.querySelector<HTMLDivElement>("#app");

  if (!rootElement) {
    throw new Error("Missing popup root element.");
  }

  const state = createPopupRuntimeState();
  state.currentState = makePopupMainState();
  const context = {
    refs: {
      document,
      rootElement,
      settingsRepository: { getPopupTheme: vi.fn(), setPopupTheme: vi.fn() },
      window
    },
    state
  };

  runPopupRootAction("toggle-popup-theme", context);
  runPopupRootAction("open-popup-settings", context);
  runPopupRootAction("close-popup-settings", context);
  runPopupRootAction("stop-all", context);
  runPopupRootAction("toggle-current-site", context);
  runPopupRootAction("enable-site-auto", context);
  runPopupRootAction("disable-site-auto", context);
  runPopupRootAction("enable-global-auto", context);
  runPopupRootAction("request-global-auto-permission", context);
  runPopupRootAction("disable-global-auto", context);
  runPopupRootAction("apply-session-boost-to-site", context);
  runPopupRootAction("apply-session-boost-to-all-sites", context);
  runPopupRootAction("reset-session-boost-on-site", context);
  runPopupRootAction("reset-session-boost-on-all-sites", context);
  runPopupRootAction("dismiss-session-boost-prompt", context);

  expect(mockedCommands.handlePopupThemeToggle).toHaveBeenCalledWith(context);
  expect(mockedCommands.openPopupSettingsView).toHaveBeenCalledWith(context);
  expect(mockedCommands.closePopupSettingsView).toHaveBeenCalledWith(context);
  expect(mockedCommands.stopPopupSessions).toHaveBeenCalledWith(context);
  expect(mockedCommands.togglePopupCurrentSitePreference).toHaveBeenCalledWith(context, 7);
  expect(mockedCommands.enablePopupCurrentTabBooster).toHaveBeenCalledWith(context, 7);
  expect(mockedCommands.disablePopupCurrentTabBooster).toHaveBeenCalledWith(context, 7);
  expect(mockedCommands.enablePopupGlobalAutoBooster).toHaveBeenCalledWith(context, 7);
  expect(mockedCommands.requestPopupGlobalAutoPermission).toHaveBeenCalledWith(context);
  expect(mockedCommands.disablePopupGlobalAutoBooster).toHaveBeenCalledWith(context);
  expect(mockedCommands.applyPopupSessionBoostToSite).toHaveBeenCalledWith(context, 7);
  expect(mockedCommands.applyPopupSessionBoostToAllSites).toHaveBeenCalledWith(context, 7);
  expect(mockedCommands.resetPopupSessionBoostOnSite).toHaveBeenCalledWith(context, 7);
  expect(mockedCommands.resetPopupSessionBoostOnAllSites).toHaveBeenCalledWith(context, 7);
  expect(mockedCommands.dismissPopupSessionBoostPrompt).toHaveBeenCalledWith(context, 7);
});
