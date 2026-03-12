import { expect, test } from "vitest";
import { buildPopupViewModel } from "../../model";
import { loadLocaleCatalog, translate } from "../../../shared/runtime-i18n";
import type { WorkerState } from "../../../shared/types";
import { getLaneStatus } from "./get-lane-status";

const baseState: WorkerState = {
  currentTab: null,
  advancedAudioSettings: {
    qualityPreset: "balanced",
    qualityProtectorMode: "balanced",
    ceilingDb: -1,
    lookaheadMs: 3,
    releaseMs: 120,
    multibandDepth: 50,
    softClipMix: 10
  },
  autoBoosterMode: "off",
  globalAutoGainPercent: 100,
  hasGlobalPermission: true,
  sessions: [],
  generatedAt: 0
};

test("maps popup lane state to the expected tone and localized copy", async () => {
  const catalog = await loadLocaleCatalog("en");
  const idleStatus = getLaneStatus(buildPopupViewModel(baseState), catalog);
  const manualStatus = getLaneStatus(
    buildPopupViewModel({
      ...baseState,
      currentTab: {
        tabId: 1,
        title: "Example",
        url: "https://example.com",
        domain: "example.com",
        supported: true,
        preferredGainPercent: 100,
        hasStoredPreference: false,
        activeLane: "manual_tab_capture",
        autoAttachState: "idle"
      }
    }),
    catalog
  );
  const permissionStatus = getLaneStatus(
    buildPopupViewModel({
      ...baseState,
      hasGlobalPermission: false,
      currentTab: {
        tabId: 2,
        title: "Video",
        url: "https://video.example",
        domain: "video.example",
        supported: true,
        preferredGainPercent: 100,
        hasStoredPreference: false,
        autoBoosterScope: "global",
        autoAttachState: "idle"
      }
    }),
    catalog
  );
  const globalStatus = getLaneStatus(
    buildPopupViewModel({
      ...baseState,
      autoBoosterMode: "global",
      currentTab: {
        tabId: 3,
        title: "Global",
        url: "https://global.example",
        domain: "global.example",
        supported: true,
        preferredGainPercent: 100,
        hasStoredPreference: false,
        autoBoosterScope: "global",
        autoAttachState: "idle"
      }
    }),
    catalog
  );

  expect(idleStatus).toEqual({
    tone: "idle",
    badge: translate(catalog, "laneBadgeIdle"),
    title: translate(catalog, "laneIdleTitle"),
    detail: translate(catalog, "laneIdleDetail")
  });
  expect(manualStatus).toEqual({
    tone: "manual",
    badge: translate(catalog, "laneBadgeManual"),
    title: translate(catalog, "laneManualTitle"),
    detail: translate(catalog, "laneManualDetail")
  });
  expect(permissionStatus).toEqual({
    tone: "watching",
    badge: translate(catalog, "laneBadgeAutomaticGlobal"),
    title: translate(catalog, "laneGlobalPermissionTitle"),
    detail: translate(catalog, "laneGlobalPermissionDetail")
  });
  expect(globalStatus).toEqual({
    tone: "automatic",
    badge: translate(catalog, "laneBadgeAutomaticGlobal"),
    title: translate(catalog, "laneGlobalArmedTitle"),
    detail: translate(catalog, "laneGlobalArmedDetail")
  });
});
