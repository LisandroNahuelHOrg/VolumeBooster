import { expect, test } from "vitest";
import { loadLocaleCatalog, translate } from "../../../shared/runtime-i18n";
import { makePopupRenderContext } from "../../test-support/make-popup-render-context";
import { renderPopupToolbar } from "./render-popup-toolbar";

test("renders toolbar state for the current view and popup theme", async () => {
  const catalog = await loadLocaleCatalog("en");
  const markup = renderPopupToolbar(
    makePopupRenderContext(catalog, {
      popupTheme: "light",
      currentView: "settings"
    })
  );

  expect(markup).toContain('data-action="premium-mock"');
  expect(markup).toContain('aria-disabled="true"');
  expect(markup).toContain('data-action="toggle-popup-theme"');
  expect(markup).toContain(translate(catalog, "popupToolbarThemeDarkLabel"));
  expect(markup).toContain('data-action="open-popup-settings"');
  expect(markup).toContain('aria-pressed="true"');
});
