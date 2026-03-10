import { getPopupToolbarItems, POPUP_TOOLBAR_ICON_MARKUP } from "./popup-toolbar";

describe("popup-toolbar", () => {
  it("keeps premium inert and renders settings as a present toolbar action", () => {
    const items = getPopupToolbarItems("dark", "main", {} as never);

    expect(items).toHaveLength(3);
    expect(items[0]).toMatchObject({
      action: "premium-mock",
      icon: "crown",
      isInert: true
    });
    expect(items[2]).toMatchObject({
      action: "open-popup-settings",
      icon: "settings_future",
      isInert: false,
      isActive: false
    });
  });

  it("flips the theme button icon and label target based on the active theme", () => {
    const darkItems = getPopupToolbarItems("dark", "main", {} as never);
    const lightItems = getPopupToolbarItems("light", "main", {} as never);

    expect(darkItems[1].icon).toBe("sun");
    expect(lightItems[1].icon).toBe("moon");
    expect(darkItems[1].label).not.toEqual(lightItems[1].label);
  });

  it("marks settings as active when the internal settings view is open", () => {
    const items = getPopupToolbarItems("dark", "settings", {} as never);

    expect(items[2].isActive).toBe(true);
  });

  it("keeps stroked toolbar icons unfilled so light mode buttons stay clean", () => {
    expect(POPUP_TOOLBAR_ICON_MARKUP.sun).toContain('fill="none"');
    expect(POPUP_TOOLBAR_ICON_MARKUP.moon).toContain('fill="none"');
    expect(POPUP_TOOLBAR_ICON_MARKUP.settings_future).toContain('fill="none"');
  });
});
