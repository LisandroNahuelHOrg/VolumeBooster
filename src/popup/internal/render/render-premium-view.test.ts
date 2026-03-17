import { expect, test } from "vitest";
import { buildPopupViewModel } from "../../model";
import { loadLocaleCatalog } from "../../../shared/runtime-i18n";
import { makePopupMainState } from "../../test-support/make-popup-main-state";
import { makePopupRenderContext } from "../../test-support/make-popup-render-context";
import { renderPremiumView } from "./render-premium-view";

test("renders trial and lifetime premium states with the new entitlement facts", async () => {
  const catalog = await loadLocaleCatalog("en");
  const trialMarkup = renderPremiumView(
    makePopupRenderContext(catalog, { currentView: "premium" }),
    buildPopupViewModel(makePopupMainState())
  );
  const licenseMarkup = renderPremiumView(
    makePopupRenderContext(catalog, { currentView: "premium" }),
    buildPopupViewModel(
      makePopupMainState({
        premiumEntitlement: {
          status: "active",
          source: "license",
          storedLicenseStatus: "valid",
          plan: "lifetime",
          isPremiumUnlocked: true,
          email: "owner@example.com",
          hasStoredLicense: true,
          seatIndex: 3,
          trialStartedAt: "2026-03-01T00:00:00.000Z",
          trialEndsAt: "2026-03-31T00:00:00.000Z",
          trialDaysRemaining: 12
        }
      })
    )
  );

  expect(trialMarkup).toContain("Your 30-day premium trial is active");
  expect(trialMarkup).toContain("Days left");
  expect(trialMarkup).toContain("Stored license");
  expect(trialMarkup).toContain("popup-premium-view__activate");
  expect(trialMarkup).toContain("Activate PREMIUM lifetime");
  expect(trialMarkup).not.toContain("popup-premium-status-card--lifetime");
  expect(trialMarkup).not.toContain("popup-premium-status-badge--lifetime");
  expect(licenseMarkup).toContain("Premium lifetime is active");
  expect(licenseMarkup).toContain("popup-premium-status-card--lifetime");
  expect(licenseMarkup).toContain("popup-premium-status-badge--lifetime");
  expect(licenseMarkup).toContain("owner@example.com");
  expect(licenseMarkup).toContain(">3<");
});
