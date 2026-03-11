import {
  ACTION_BADGE_IDLE_COLOR,
  ACTION_BADGE_PULSE_COLOR,
  ACTION_BADGE_TEXT,
  ACTION_BADGE_TEXT_COLOR
} from "../constants";
import type { WorkerRuntimeState } from "../runtime-state";
import { isTabAudible } from "./is-tab-audible";
import { pruneAudibleTabs } from "./prune-audible-tabs";

export async function syncActionBadges(runtime: WorkerRuntimeState): Promise<void> {
  if (!chrome.action) {
    return;
  }

  pruneAudibleTabs(runtime);

  const nextBadgedTabs = new Set<number>();

  for (const session of runtime.sessions.values()) {
    if (session.streamState === "active" && isTabAudible(runtime, session.tabId)) {
      nextBadgedTabs.add(session.tabId);
    }
  }

  const relevantTabIds = new Set<number>([...runtime.badgedTabs, ...runtime.sessions.keys()]);
  const updates: Promise<unknown>[] = [];

  for (const tabId of relevantTabIds) {
    const shouldBadge = nextBadgedTabs.has(tabId);
    updates.push(chrome.action.setBadgeText({ tabId, text: shouldBadge ? ACTION_BADGE_TEXT : "" }));

    if (shouldBadge) {
      if (chrome.action.setBadgeTextColor) {
        updates.push(
          chrome.action.setBadgeTextColor({
            tabId,
            color: ACTION_BADGE_TEXT_COLOR
          })
        );
      }

      updates.push(
        chrome.action.setBadgeBackgroundColor({
          tabId,
          color:
            isTabAudible(runtime, tabId) && runtime.badgePulseHighlighted
              ? ACTION_BADGE_PULSE_COLOR
              : ACTION_BADGE_IDLE_COLOR
        })
      );
    }
  }

  await Promise.allSettled(updates);

  runtime.badgedTabs.clear();

  for (const tabId of nextBadgedTabs) {
    runtime.badgedTabs.add(tabId);
  }
}
