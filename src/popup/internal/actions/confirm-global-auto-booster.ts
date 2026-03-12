import { translate, type UiCatalog } from "../../../shared/runtime-i18n";
import type { WorkerState } from "../../../shared/types";

export function confirmGlobalAutoBooster(
  catalog: UiCatalog | null,
  state: WorkerState | null | undefined,
  confirmFn: (message?: string) => boolean
): boolean {
  if (!catalog) {
    return true;
  }

  const isSiteEnabled =
    state?.currentTab?.autoBoosterScope === "site" && state.currentTab.autoAttachState !== "idle";

  return confirmFn(
    `${translate(catalog, "globalAutoWarningTitle")}\n\n${translate(
      catalog,
      isSiteEnabled ? "globalAutoSwitchWarningBody" : "globalAutoWarningBody"
    )}`
  );
}
