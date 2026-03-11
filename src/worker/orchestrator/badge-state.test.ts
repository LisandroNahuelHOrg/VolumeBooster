import { isTabAudible } from "./badge/is-tab-audible";
import { pruneAudibleTabs } from "./badge/prune-audible-tabs";
import { syncActionBadges } from "./badge/sync-action-badges";
import { updateAudibleState } from "./badge/update-audible-state";
import { createTestRuntime, makeSession } from "./test-harness";

describe("worker/orchestrator badge state", () => {
  const actionSetBadgeText = vi.fn();
  const actionSetBadgeTextColor = vi.fn();
  const actionSetBadgeBackgroundColor = vi.fn();

  beforeEach(() => {
    actionSetBadgeText.mockReset();
    actionSetBadgeTextColor.mockReset();
    actionSetBadgeBackgroundColor.mockReset();

    vi.stubGlobal(
      "chrome",
      {
        action: {
          setBadgeText: actionSetBadgeText,
          setBadgeTextColor: actionSetBadgeTextColor,
          setBadgeBackgroundColor: actionSetBadgeBackgroundColor
        }
      } as unknown as typeof chrome
    );
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("tracks audible tabs and paints the badge only while audio is active", async () => {
    const { runtime } = createTestRuntime(100);
    runtime.sessions.set(31, makeSession(31, "youtube.com", 220, { streamState: "active", level: 0 }));

    expect(updateAudibleState(runtime, 31, 0.025)).toBe(true);
    expect(isTabAudible(runtime, 31)).toBe(true);

    runtime.badgePulseHighlighted = true;
    await syncActionBadges(runtime);

    expect(actionSetBadgeText).toHaveBeenCalledWith({ tabId: 31, text: "🔊" });

    runtime.audibleTabs.set(31, 100);
    pruneAudibleTabs(runtime);

    expect(isTabAudible(runtime, 31)).toBe(false);
  });
});
