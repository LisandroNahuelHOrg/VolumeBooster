import { beforeEach, expect, test, vi } from "vitest";
import { resolvePremiumEntitlementState } from "./resolve-premium-entitlement-state";

const validatePremiumLicenseActivation = vi.hoisted(() => vi.fn());

vi.mock("./validate-premium-license-activation", () => ({
  validatePremiumLicenseActivation
}));

const trialRecord = {
  version: 1 as const,
  firstInstalledAt: "2026-03-01T00:00:00.000Z",
  trialEndsAt: "2026-03-31T00:00:00.000Z",
  trialConsumed: false,
  lastSeenAt: "2026-03-16T00:00:00.000Z"
};

beforeEach(() => {
  validatePremiumLicenseActivation.mockReset();
});

test("resolves free, trial, invalid-license, and valid-license entitlement precedence", async () => {
  validatePremiumLicenseActivation
    .mockResolvedValueOnce({ ok: false })
    .mockResolvedValueOnce({ ok: true, normalizedEmail: "owner@example.com", seatIndex: 7 });

  await expect(resolvePremiumEntitlementState(null, trialRecord, Date.parse("2026-03-16T00:00:00.000Z"))).resolves.toMatchObject({
    status: "active",
    source: "trial",
    storedLicenseStatus: "none",
    plan: "trial",
    isPremiumUnlocked: true
  });
  await expect(resolvePremiumEntitlementState(null, trialRecord, Date.parse("2026-04-02T00:00:00.000Z"))).resolves.toMatchObject({
    status: "inactive",
    source: "free",
    storedLicenseStatus: "none",
    plan: "free",
    isPremiumUnlocked: false
  });
  await expect(resolvePremiumEntitlementState({ email: "broken@example.com", licenseKey: "bad" }, trialRecord, Date.parse("2026-03-16T00:00:00.000Z"))).resolves.toMatchObject({
    status: "active",
    source: "trial",
    storedLicenseStatus: "invalid",
    hasStoredLicense: true
  });
  await expect(resolvePremiumEntitlementState({ email: "owner@example.com", licenseKey: "good" }, trialRecord, Date.parse("2026-03-16T00:00:00.000Z"))).resolves.toMatchObject({
    status: "active",
    source: "license",
    storedLicenseStatus: "valid",
    plan: "lifetime",
    email: "owner@example.com",
    seatIndex: 7
  });
});
