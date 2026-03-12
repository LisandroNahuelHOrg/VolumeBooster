import { t, translate, type UiCatalog } from "../../../shared/runtime-i18n";
import type { PopupViewModel } from "../../../shared/types";

export interface LaneStatusDescriptor {
  tone: "idle" | "manual" | "automatic" | "watching" | "failed" | "unsupported";
  badge: string;
  title: string;
  detail: string;
}

export function getLaneStatus(
  viewModel: PopupViewModel,
  catalog: UiCatalog | null
): LaneStatusDescriptor {
  if (!catalog) {
    return {
      tone: "idle",
      badge: t("laneBadgeIdle"),
      title: t("laneIdleTitle"),
      detail: t("laneIdleDetail")
    };
  }

  const currentTab = viewModel.currentTab;

  if (!currentTab) {
    return {
      tone: "idle",
      badge: translate(catalog, "laneBadgeIdle"),
      title: translate(catalog, "laneIdleTitle"),
      detail: translate(catalog, "laneIdleDetail")
    };
  }

  if (currentTab.activeLane === "manual_tab_capture") {
    return {
      tone: "manual",
      badge: translate(catalog, "laneBadgeManual"),
      title: translate(catalog, "laneManualTitle"),
      detail: translate(catalog, "laneManualDetail")
    };
  }

  if (currentTab.activeLane === "auto_media_element") {
    return {
      tone: "automatic",
      badge: translate(catalog, currentTab.autoBoosterScope === "global" ? "laneBadgeAutomaticGlobal" : "laneBadgeAutomaticSite"),
      title: translate(catalog, currentTab.autoBoosterScope === "global" ? "laneAutomaticGlobalTitle" : "laneAutomaticSiteTitle"),
      detail: translate(catalog, currentTab.autoBoosterScope === "global" ? "laneAutomaticGlobalDetail" : "laneAutomaticSiteDetail")
    };
  }

  if (currentTab.autoAttachState === "observing" || currentTab.autoAttachState === "awaiting_user_gesture") {
    return {
      tone: "watching",
      badge: translate(catalog, "laneBadgeWatching"),
      title: translate(catalog, currentTab.autoBoosterScope === "global" ? (currentTab.autoAttachState === "observing" ? "laneWatchingGlobalTitle" : "laneInteractionGlobalTitle") : (currentTab.autoAttachState === "observing" ? "laneWatchingSiteTitle" : "laneInteractionSiteTitle")),
      detail: translate(catalog, currentTab.autoBoosterScope === "global" ? (currentTab.autoAttachState === "observing" ? "laneWatchingGlobalDetail" : "laneInteractionGlobalDetail") : (currentTab.autoAttachState === "observing" ? "laneWatchingSiteDetail" : "laneInteractionSiteDetail"))
    };
  }

  if (currentTab.autoAttachState === "failed" || currentTab.autoAttachState === "unsupported" || !currentTab.supported) {
    return {
      tone: "unsupported",
      badge: translate(catalog, "laneBadgeUnavailable"),
      title: translate(catalog, "laneUnsupportedTitle"),
      detail: translate(catalog, "laneUnsupportedDetail")
    };
  }

  if (!viewModel.hasGlobalPermission && viewModel.autoBoosterMode !== "global") {
    return {
      tone: "watching",
      badge: translate(catalog, "laneBadgeAutomaticGlobal"),
      title: translate(catalog, "laneGlobalPermissionTitle"),
      detail: translate(catalog, "laneGlobalPermissionDetail")
    };
  }

  if (viewModel.autoBoosterMode === "global") {
    return {
      tone: "automatic",
      badge: translate(catalog, "laneBadgeAutomaticGlobal"),
      title: translate(catalog, "laneGlobalArmedTitle"),
      detail: translate(catalog, "laneGlobalArmedDetail")
    };
  }

  return {
    tone: "idle",
    badge: translate(catalog, "laneBadgeIdle"),
    title: translate(catalog, "laneIdleTitle"),
    detail: translate(catalog, "laneIdleDetail")
  };
}
