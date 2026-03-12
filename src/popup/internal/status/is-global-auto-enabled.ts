import type { PopupViewModel } from "../../../shared/types";

export function isGlobalAutoEnabled(viewModel: PopupViewModel): boolean {
  return viewModel.autoBoosterMode === "global";
}
