import { expect, test } from "vitest";
import { buildPopupViewModel } from "../../model";
import { loadLocaleCatalog } from "../../../shared/runtime-i18n";
import { makePopupMainState } from "../../test-support/make-popup-main-state";
import { makePopupRenderContext } from "../../test-support/make-popup-render-context";
import { createMainViewRenderModel } from "./create-main-view-render-model";
import { renderMainView } from "./render-main-view";

test("renders premium lock banners and premium CTAs when entitlement is inactive", async () => {
  const catalog = await loadLocaleCatalog("en");
  const state = makePopupMainState({
    premiumEntitlement: {
      status: "inactive",
      source: "free",
      storedLicenseStatus: "none",
      plan: "free",
      isPremiumUnlocked: false,
      email: null,
      hasStoredLicense: false,
      seatIndex: null,
      trialStartedAt: "2026-01-01T00:00:00.000Z",
      trialEndsAt: "2026-01-31T00:00:00.000Z",
      trialDaysRemaining: 0
    }
  });
  const result = createMainViewRenderModel(buildPopupViewModel(state), makePopupRenderContext(catalog), 0);
  const markup = renderMainView(result.model);

  expect(markup).toContain('data-role="premium-lock-banner"');
  expect(markup).toContain('data-action="open-popup-premium"');
  expect(markup).toContain('data-premium-locked="true"');
  expect(markup).toContain("Premium required");
});
