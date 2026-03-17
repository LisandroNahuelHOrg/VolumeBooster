import { DEFAULT_ADVANCED_AUDIO_SETTINGS } from "../../shared/audio-settings";
import type { WorkerState } from "../../shared/types";

export function makePopupMainState(overrides: Partial<WorkerState> = {}): WorkerState {
  return {
    currentTab: {
      tabId: 7,
      title: "Extensions",
      url: "chrome://extensions",
      domain: "extensions",
      supported: false,
      preferredGainPercent: 100,
      hasStoredPreference: false,
      autoAttachState: "unsupported",
      autoAttachReason: "site_not_hookable"
    },
    advancedAudioSettings: { ...DEFAULT_ADVANCED_AUDIO_SETTINGS },
    autoBoosterMode: "off",
    globalAutoGainPercent: 100,
    hasGlobalPermission: true,
    premiumEntitlement: {
      status: "active",
      source: "trial",
      storedLicenseStatus: "none",
      plan: "trial",
      isPremiumUnlocked: true,
      email: null,
      hasStoredLicense: false,
      seatIndex: null,
      trialStartedAt: "2026-03-01T00:00:00.000Z",
      trialEndsAt: "2026-03-31T00:00:00.000Z",
      trialDaysRemaining: 15
    },
    sessions: [],
    generatedAt: 1,
    ...overrides
  };
}
