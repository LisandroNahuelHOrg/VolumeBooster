import { expect, test } from "vitest";
import { buildPopupViewModel } from "../../model";
import { loadLocaleCatalog, translate } from "../../../shared/runtime-i18n";
import type { AdvancedAudioSettings } from "../../../shared/types";
import { makePopupMainSession } from "../../test-support/make-popup-main-session";
import { makePopupMainState } from "../../test-support/make-popup-main-state";
import { makePopupRenderContext } from "../../test-support/make-popup-render-context";
import { createMainViewRenderModel } from "./create-main-view-render-model";

test("prefers draft advanced settings and derives transient, lane, and carousel state", async () => {
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
    hasGlobalPermission: false,
    sessions: [91, 92, 93, 94, 95].map((tabId) => makePopupMainSession({ tabId })),
    generatedAt: 2
  });
  const draftSettings: AdvancedAudioSettings = {
    ...state.advancedAudioSettings,
    qualityPreset: "maximum_clarity",
    lookaheadMs: 7.5
  };
  const pendingSettings: AdvancedAudioSettings = {
    ...state.advancedAudioSettings,
    qualityPreset: "warm_cinematic"
  };
  const result = createMainViewRenderModel(
    buildPopupViewModel(state),
    makePopupRenderContext(catalog, {
      draftGainPercent: 275,
      draftAdvancedAudioSettings: draftSettings,
      pendingAdvancedAudioSettings: pendingSettings,
      transientError: { key: "tabUnavailable" }
    }),
    99
  );

  expect(result.model.advancedAudioSettings).toEqual(draftSettings);
  expect(result.model.transientErrorMessage).toBe(translate(catalog, "tabUnavailable"));
  expect(result.model.laneStatus.title).toBe(translate(catalog, "laneGlobalPermissionTitle"));
  expect(result.model.globalAutoAction).toBe("request-global-auto-permission");
  expect(result.model.sessionCarousel.offset).toBe(2);
  expect(result.nextSessionCarouselOffset).toBe(2);
});

test("falls back to pending advanced settings when draft settings are absent", async () => {
  const catalog = await loadLocaleCatalog("en");
  const state = makePopupMainState();
  const pendingSettings: AdvancedAudioSettings = {
    ...state.advancedAudioSettings,
    qualityPreset: "warm_cinematic",
    softClipMix: 22.5
  };
  const result = createMainViewRenderModel(
    buildPopupViewModel(state),
    makePopupRenderContext(catalog, {
      draftAdvancedAudioSettings: null,
      pendingAdvancedAudioSettings: pendingSettings
    }),
    0
  );

  expect(result.model.advancedAudioSettings).toEqual(pendingSettings);
  expect(result.model.qualityPresetLabel).toBe(translate(catalog, "presetWarmCinematic"));
});
