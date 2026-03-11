import type { PopupViewModel } from "../shared/types";

export function shouldShowSessionBoostActionBar(
  viewModel: PopupViewModel,
  isSettingsView: boolean,
  hiddenLocally: boolean,
  hasLocalPendingDraft: boolean
): boolean {
  if (isSettingsView || hiddenLocally || !viewModel.currentTab) {
    return false;
  }

  if (hasLocalPendingDraft) {
    return true;
  }

  if (viewModel.sessionBoostPromptState?.dismissed) {
    return false;
  }

  return viewModel.sessionBoostPromptState?.hasUnsavedChanges === true;
}
