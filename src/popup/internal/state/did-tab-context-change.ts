import type { WorkerState } from "../../../shared/types";
import { getTabContextKey } from "./get-tab-context-key";
import { getTabIdentityKey } from "./get-tab-identity-key";
import { hasManualSessionForActiveTab } from "./has-manual-session-for-active-tab";

export function didTabContextChange(
  previousState: WorkerState | null,
  nextState: WorkerState
): boolean {
  const previousTab = previousState?.currentTab;
  const nextTab = nextState.currentTab;
  const nextTabId = nextTab?.tabId;
  const isSameTab = typeof nextTabId === "number" && previousTab?.tabId === nextTabId;
  const preserveManualNavigationContext =
    isSameTab &&
    (hasManualSessionForActiveTab(previousState, nextTabId) ||
      hasManualSessionForActiveTab(nextState, nextTabId));

  if (preserveManualNavigationContext) {
    return getTabIdentityKey(previousTab) !== getTabIdentityKey(nextTab);
  }

  return getTabContextKey(previousTab) !== getTabContextKey(nextTab);
}
