import { expect, test } from "vitest";
import { buildPopupViewModel } from "../../model";
import { loadLocaleCatalog } from "../../../shared/runtime-i18n";
import { makePopupMainState } from "../../test-support/make-popup-main-state";
import { makePopupRenderContext } from "../../test-support/make-popup-render-context";
import { createMainViewRenderModel } from "./create-main-view-render-model";
import { renderMainView } from "./render-main-view";

test("renders unsupported and locked states with advanced controls and session placeholders", async () => {
  const catalog = await loadLocaleCatalog("en");
  const state = makePopupMainState({ currentTab: null, sessions: [] });
  const result = createMainViewRenderModel(
    buildPopupViewModel(state),
    makePopupRenderContext(catalog, {
      transientError: { key: "tabUnavailable" }
    }),
    0
  );
  const markup = renderMainView(result.model);

  expect(markup).toContain('data-role="error-banner"');
  expect(markup).toContain('data-action="enable-site-auto"');
  expect(markup).toContain('data-action="enable-global-auto"');
  expect(markup).not.toContain('data-role="toggle-current"');
  expect(markup).toContain('data-role="advanced-settings"');
  expect(markup).toContain('data-role="clip-events-value">0<');
  expect(markup).toContain('data-session-placeholder="0"');
});

test("renders the global permission recovery action when host access is missing", async () => {
  const catalog = await loadLocaleCatalog("en");
  const state = makePopupMainState({
    currentTab: {
      tabId: 7,
      title: "Video",
      url: "https://video.example",
      domain: "video.example",
      supported: true,
      preferredGainPercent: 100,
      hasStoredPreference: false,
      autoBoosterScope: "global",
      autoAttachState: "idle"
    },
    hasGlobalPermission: false
  });
  const result = createMainViewRenderModel(
    buildPopupViewModel(state),
    makePopupRenderContext(catalog),
    0
  );

  expect(renderMainView(result.model)).toContain('data-action="request-global-auto-permission"');
  expect(renderMainView(result.model)).not.toContain('data-role="toggle-current"');
});
