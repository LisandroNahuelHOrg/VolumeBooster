// @vitest-environment happy-dom

import { createPopupUiState } from "./popup-ui-state";
import { togglePopupSettingsView } from "./toggle-popup-settings-view";

describe("toggle-popup-settings-view", () => {
  it("opens settings on the first toggle and returns to main on the second", () => {
    const initialState = createPopupUiState("dark");

    const settingsState = togglePopupSettingsView(initialState);
    const closedState = togglePopupSettingsView(settingsState);

    expect(settingsState.currentView).toBe("settings");
    expect(closedState.currentView).toBe("main");
    expect(closedState.popupTheme).toBe("dark");
  });
});
