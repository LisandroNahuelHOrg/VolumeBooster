// @vitest-environment happy-dom

import { createPopupMainHarness } from "./test-support/create-popup-main-harness";
import { flushPopupMainMicrotasks } from "./test-support/flush-popup-main-microtasks";
import { getPopupThemeButton } from "./test-support/get-popup-theme-button";
import { makePopupMainState } from "./test-support/make-popup-main-state";

describe("popup main settings sync", () => {
  let harness: ReturnType<typeof createPopupMainHarness>;

  beforeEach(() => {
    harness = createPopupMainHarness();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it("keeps the theme summary and toolbar state aligned across settings and worker rerenders", async () => {
    await harness.importPopupMain();

    const openSettingsButton = document.querySelector<HTMLButtonElement>("[data-action='open-popup-settings']");

    if (!openSettingsButton) {
      throw new Error("Expected the popup settings button to be rendered.");
    }

    openSettingsButton.click();
    await flushPopupMainMicrotasks();

    const firstThemeName = document.querySelector<HTMLElement>("[data-role='popup-theme-name']");

    if (!firstThemeName) {
      throw new Error("Expected the popup settings theme summary to be rendered.");
    }

    const initialThemeName = firstThemeName.textContent;
    getPopupThemeButton().click();
    await flushPopupMainMicrotasks();

    expect(document.documentElement.dataset.popupTheme).toBe("light");
    expect(document.querySelector<HTMLElement>("[data-role='popup-theme-name']")?.textContent).not.toBe(initialThemeName);

    harness.getRuntimeMessageListener()?.({
      type: "WORKER_STATE_UPDATE",
      payload: makePopupMainState({ generatedAt: 2 })
    });
    await flushPopupMainMicrotasks();

    expect(document.documentElement.dataset.popupTheme).toBe("light");
    expect(getPopupThemeButton().dataset.popupThemeTarget).toBe("dark");
    expect(document.querySelector<HTMLElement>("[data-role='popup-theme-name']")?.textContent).not.toBe(initialThemeName);
  });

  it("returns to the main popup view when the settings toolbar button is clicked twice", async () => {
    await harness.importPopupMain();

    const openSettingsButton = document.querySelector<HTMLButtonElement>("[data-action='open-popup-settings']");

    if (!openSettingsButton) {
      throw new Error("Expected the popup settings button to be rendered.");
    }

    openSettingsButton.click();
    await flushPopupMainMicrotasks();

    expect(document.querySelector<HTMLElement>("[data-role='popup-theme-name']")).not.toBeNull();
    expect(document.querySelector<HTMLButtonElement>("[data-action='close-popup-settings']")).not.toBeNull();

    const toggledSettingsButton = document.querySelector<HTMLButtonElement>("[data-action='open-popup-settings']");

    if (!toggledSettingsButton) {
      throw new Error("Expected the popup settings button to remain rendered.");
    }

    toggledSettingsButton.click();
    await flushPopupMainMicrotasks();

    expect(document.querySelector<HTMLElement>("[data-role='popup-theme-name']")).toBeNull();
    expect(document.querySelector<HTMLButtonElement>("[data-action='close-popup-settings']")).toBeNull();
  });
});
