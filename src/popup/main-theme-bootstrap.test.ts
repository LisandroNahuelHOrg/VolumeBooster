// @vitest-environment happy-dom

import { createPopupMainHarness } from "./test-support/create-popup-main-harness";
import { flushPopupMainMicrotasks } from "./test-support/flush-popup-main-microtasks";
import { getPopupThemeButton } from "./test-support/get-popup-theme-button";

describe("popup main theme bootstrap", () => {
  let harness: ReturnType<typeof createPopupMainHarness>;

  beforeEach(() => {
    harness = createPopupMainHarness();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it("boots with the persisted light theme already applied", async () => {
    harness.setPersistedTheme("light");

    await harness.importPopupMain();

    expect(document.documentElement.dataset.popupTheme).toBe("light");
    expect(getPopupThemeButton().dataset.popupThemeTarget).toBe("dark");
  });

  it("handles clicks that land directly on the toolbar svg icon", async () => {
    await harness.importPopupMain();

    const themeButton = getPopupThemeButton();
    const themeIcon = themeButton.querySelector<SVGElement>(".popup-toolbar__icon svg");

    if (!themeIcon) {
      throw new Error("Expected the popup theme icon SVG to be rendered.");
    }

    themeIcon.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true }));
    await flushPopupMainMicrotasks();

    expect(document.documentElement.dataset.popupTheme).toBe("light");
    expect(getPopupThemeButton()).toBe(themeButton);
    expect(themeButton.dataset.popupThemeTarget).toBe("dark");
  });
});
