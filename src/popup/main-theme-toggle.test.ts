// @vitest-environment happy-dom

import type { PopupTheme } from "../shared/types";
import { createPopupMainDeferred } from "./test-support/create-popup-main-deferred";
import { createPopupMainHarness } from "./test-support/create-popup-main-harness";
import { flushPopupMainMicrotasks } from "./test-support/flush-popup-main-microtasks";
import { getPopupThemeButton } from "./test-support/get-popup-theme-button";

describe("popup main theme toggle", () => {
  let harness: ReturnType<typeof createPopupMainHarness>;

  beforeEach(() => {
    harness = createPopupMainHarness();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it("changes theme on the first click without replacing the toolbar button node", async () => {
    await harness.importPopupMain();

    const themeButton = getPopupThemeButton();
    const initialTitle = themeButton.title;

    themeButton.click();
    await flushPopupMainMicrotasks();

    expect(document.documentElement.dataset.popupTheme).toBe("light");
    expect(themeButton.isConnected).toBe(true);
    expect(getPopupThemeButton()).toBe(themeButton);
    expect(themeButton.title).not.toBe(initialTitle);
    expect(themeButton.dataset.popupThemeTarget).toBe("dark");

    themeButton.click();
    await flushPopupMainMicrotasks();

    expect(document.documentElement.dataset.popupTheme).toBe("dark");
    expect(getPopupThemeButton()).toBe(themeButton);
    expect(themeButton.dataset.popupThemeTarget).toBe("light");
  });

  it("keeps the final theme correct after five rapid clicks even if persistence is slow", async () => {
    const writes: Array<ReturnType<typeof createPopupMainDeferred<PopupTheme>> & { theme: PopupTheme }> = [];
    harness.setPopupThemeMock.mockImplementation((theme: PopupTheme) => {
      const write = {
        theme,
        ...createPopupMainDeferred<PopupTheme>()
      };
      writes.push(write);
      return write.promise;
    });

    await harness.importPopupMain();

    const themeButton = getPopupThemeButton();

    for (let index = 0; index < 5; index += 1) {
      themeButton.click();
    }

    await flushPopupMainMicrotasks();

    expect(document.documentElement.dataset.popupTheme).toBe("light");
    expect(getPopupThemeButton()).toBe(themeButton);
    expect(harness.setPopupThemeMock).toHaveBeenCalledTimes(1);
    expect(writes[0]?.theme).toBe("light");

    for (let index = 0; index < 4; index += 1) {
      writes[index].resolve(writes[index].theme);
      await flushPopupMainMicrotasks();
      expect(writes.length).toBe(index + 2);
    }

    writes[4].resolve(writes[4].theme);
    await flushPopupMainMicrotasks();

    expect(harness.setPopupThemeMock.mock.calls.map(([theme]) => theme)).toEqual([
      "light",
      "dark",
      "light",
      "dark",
      "light"
    ]);
    expect(document.documentElement.dataset.popupTheme).toBe("light");
  });

  it("survives a rejected persistence write and still toggles again on the next click", async () => {
    harness.setPopupThemeMock
      .mockRejectedValueOnce(new Error("storage unavailable"))
      .mockImplementation(async (theme: PopupTheme) => theme);

    await harness.importPopupMain();

    const themeButton = getPopupThemeButton();
    themeButton.click();
    await flushPopupMainMicrotasks();

    expect(document.documentElement.dataset.popupTheme).toBe("light");
    expect(harness.captureExceptionSafeMock).toHaveBeenCalledTimes(1);

    themeButton.click();
    await flushPopupMainMicrotasks();

    expect(document.documentElement.dataset.popupTheme).toBe("dark");
    expect(harness.setPopupThemeMock).toHaveBeenCalledTimes(2);
  });
});
