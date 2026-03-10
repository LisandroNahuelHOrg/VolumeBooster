// @vitest-environment happy-dom

import {
  applyPopupTheme,
  closePopupSettings,
  createPopupUiState,
  enqueuePopupThemePersistence,
  openPopupSettings,
  togglePopupThemeLocally,
  togglePopupTheme
} from "./popup-ui-state";

describe("popup-ui-state", () => {
  it("opens settings and returns to the main popup view", () => {
    const initialState = createPopupUiState("dark");

    const settingsState = openPopupSettings(initialState);
    const closedState = closePopupSettings(settingsState);

    expect(settingsState.currentView).toBe("settings");
    expect(closedState.currentView).toBe("main");
    expect(closedState.popupTheme).toBe("dark");
  });

  it("applies the popup theme to the document root", () => {
    applyPopupTheme("light");
    expect(document.documentElement.dataset.popupTheme).toBe("light");

    applyPopupTheme("dark");
    expect(document.documentElement.dataset.popupTheme).toBe("dark");
  });

  it("toggles the popup theme, updates the document, and persists the new choice", async () => {
    const persistence = {
      setPopupTheme: vi.fn(async (theme: "dark" | "light") => theme)
    };

    const nextState = await togglePopupTheme(createPopupUiState("dark"), persistence, document);

    expect(nextState.popupTheme).toBe("light");
    expect(document.documentElement.dataset.popupTheme).toBe("light");
    expect(persistence.setPopupTheme).toHaveBeenCalledWith("light");
  });

  it("flips local popup theme state on every toggle without waiting for persistence", () => {
    const lightState = togglePopupThemeLocally(createPopupUiState("dark"), document);
    const darkState = togglePopupThemeLocally(lightState, document);

    expect(lightState.popupTheme).toBe("light");
    expect(darkState.popupTheme).toBe("dark");
    expect(document.documentElement.dataset.popupTheme).toBe("dark");
  });

  it("serializes persisted theme writes so rapid toggles stay ordered", async () => {
    let resolveFirstWrite: (() => void) | null = null;
    const persistedThemes: Array<"dark" | "light"> = [];
    const persistence = {
      setPopupTheme: vi.fn((theme: "dark" | "light") => {
        persistedThemes.push(theme);

        if (theme === "light") {
          return new Promise<"dark" | "light">((resolve) => {
            resolveFirstWrite = () => resolve(theme);
          });
        }

        return Promise.resolve(theme);
      })
    };

    let persistQueue = Promise.resolve();
    persistQueue = enqueuePopupThemePersistence(persistQueue, persistence, "light");
    persistQueue = enqueuePopupThemePersistence(persistQueue, persistence, "dark");

    await new Promise((resolve) => window.setTimeout(resolve, 0));
    expect(persistence.setPopupTheme).toHaveBeenCalledTimes(1);
    expect(persistedThemes).toEqual(["light"]);

    const releaseFirstWrite = resolveFirstWrite;

    if (!releaseFirstWrite) {
      throw new Error("Expected the first queued popup theme write to stay pending.");
    }

    (releaseFirstWrite as () => void)();
    await persistQueue;

    expect(persistence.setPopupTheme).toHaveBeenCalledTimes(2);
    expect(persistedThemes).toEqual(["light", "dark"]);
  });
});
