import type { PopupViewModel } from "../../../shared/types";

export function globalBoosterButtonAction(viewModel: PopupViewModel): string {
  if (viewModel.autoBoosterMode === "global") {
    return "disable-global-auto";
  }

  return viewModel.hasGlobalPermission ? "enable-global-auto" : "request-global-auto-permission";
}
