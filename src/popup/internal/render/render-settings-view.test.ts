import { expect, test } from "vitest";
import { loadLocaleCatalog, translate } from "../../../shared/runtime-i18n";
import { makePopupRenderContext } from "../../test-support/make-popup-render-context";
import { renderSettingsView } from "./render-settings-view";

test("renders the localized settings view and repeats the theme summary nodes", async () => {
  const catalog = await loadLocaleCatalog("en");
  const markup = renderSettingsView(
    makePopupRenderContext(catalog, {
      popupTheme: "light",
      currentView: "settings"
    })
  );

  expect(markup).toContain('data-action="close-popup-settings"');
  expect(markup).toContain(translate(catalog, "popupSettingsTitle"));
  expect(markup).toContain(translate(catalog, "popupThemeLightName"));
  expect((markup.match(/data-role="popup-theme-name"/g) ?? []).length).toBe(2);
});
