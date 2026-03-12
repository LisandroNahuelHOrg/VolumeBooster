import type { PopupViewModel } from "../../../shared/types";

export function isSiteAutoEnabled(viewModel: PopupViewModel): boolean {
  return viewModel.autoBoosterMode !== "global" && Boolean(viewModel.currentManualSession);
}
