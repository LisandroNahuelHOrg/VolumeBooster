import { translate, type UiCatalog } from "../../../shared/runtime-i18n";
import type { WorkerState } from "../../../shared/types";

export function confirmCurrentSiteAutoBooster(
  catalog: UiCatalog | null,
  state: WorkerState | null | undefined,
  confirmFn: (message?: string) => boolean
): boolean {
  if (!catalog) {
    return true;
  }

  const isGlobalEnabled = state?.autoBoosterMode === "global";

  return confirmFn(
    `${translate(catalog, "siteAutoWarningTitle")}\n\n${translate(
      catalog,
      isGlobalEnabled ? "siteAutoSwitchWarningBody" : "siteAutoWarningBody"
    )}`
  );
}
