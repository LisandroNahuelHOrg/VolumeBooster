import { afterEach, expect, test, vi } from "vitest";
import { applyQualityPreset } from "../../../shared/audio-settings";
import {
  DEFAULT_PREMIUM_ENTITLEMENT_STATE,
  FREEMIUM_ADVANCED_AUDIO_SETTINGS
} from "../../../shared/premium-license";
import type { CaptureSessionState } from "../../../shared/types";
import { createTestRuntime } from "../internal/test-harness/create-test-runtime";
import { setAdvancedAudioSettings } from "./set-advanced-audio-settings";

const MANUAL_SESSION: CaptureSessionState = {
  tabId: 7,
  title: "YouTube",
  url: "https://youtube.com/watch?v=1",
  domain: "youtube.com",
  gainPercent: 220,
  engineLane: "manual_tab_capture",
  autoAttachState: "idle",
  streamState: "active",
  engineStatus: "ready",
  level: 0.2,
  warning: "none",
  protectorActionDb: 0,
  clipEvents: 0,
  clipPeak: 0,
  protectionBypassed: false,
  outputPeak: 0.4,
  updatedAt: 1
};

afterEach(() => {
  vi.unstubAllGlobals();
});

test("keeps premium settings persisted while applying freemium runtime settings when premium is locked", async () => {
  const harness = createTestRuntime();

  vi.stubGlobal("chrome", {
    action: {
      setBadgeText: vi.fn(),
      setBadgeTextColor: vi.fn(),
      setBadgeBackgroundColor: vi.fn()
    },
    runtime: {
      sendMessage: vi.fn().mockResolvedValue(undefined)
    },
    tabs: {
      query: vi.fn().mockResolvedValue([])
    }
  } as unknown as typeof chrome);
  harness.runtime.premiumEntitlement = { ...DEFAULT_PREMIUM_ENTITLEMENT_STATE };
  harness.runtime.manualSessions.set(MANUAL_SESSION.tabId, MANUAL_SESSION);

  await setAdvancedAudioSettings(
    harness.runtime,
    applyQualityPreset("maximum_clarity")
  );

  expect(await harness.storage.getAdvancedAudioSettings()).toEqual(
    expect.objectContaining({ qualityPreset: "maximum_clarity" })
  );
  expect(harness.offscreenClient.setAdvancedAudioSettings).toHaveBeenCalledWith(
    FREEMIUM_ADVANCED_AUDIO_SETTINGS
  );
});

test("reuses stored premium settings after premium becomes active again", async () => {
  const harness = createTestRuntime();

  vi.stubGlobal("chrome", {
    action: {
      setBadgeText: vi.fn(),
      setBadgeTextColor: vi.fn(),
      setBadgeBackgroundColor: vi.fn()
    },
    runtime: {
      sendMessage: vi.fn().mockResolvedValue(undefined)
    },
    tabs: {
      query: vi.fn().mockResolvedValue([])
    }
  } as unknown as typeof chrome);
  harness.runtime.premiumEntitlement = { ...DEFAULT_PREMIUM_ENTITLEMENT_STATE };
  harness.runtime.manualSessions.set(MANUAL_SESSION.tabId, MANUAL_SESSION);
  await setAdvancedAudioSettings(
    harness.runtime,
    applyQualityPreset("maximum_clarity")
  );

  harness.offscreenClient.setAdvancedAudioSettings.mockClear();
  harness.runtime.manualSessions.set(MANUAL_SESSION.tabId, MANUAL_SESSION);
  harness.runtime.premiumEntitlement = {
    ...DEFAULT_PREMIUM_ENTITLEMENT_STATE,
    status: "active",
    source: "license",
    storedLicenseStatus: "valid",
    plan: "lifetime",
    isPremiumUnlocked: true,
    email: "owner@example.com",
    hasStoredLicense: true,
    seatIndex: 1
  };

  await setAdvancedAudioSettings(harness.runtime, {});

  expect(harness.offscreenClient.setAdvancedAudioSettings).toHaveBeenCalledWith(
    expect.objectContaining({ qualityPreset: "maximum_clarity" })
  );
});
