import { expect, test } from "vitest";
import { hasManualSession } from "./auto-booster/results/has-manual-session.mjs";

test("detects active or pending manual tab capture sessions for the requested tab", () => {
  expect(
    hasManualSession(
      {
        sessions: [
          { engineLane: "manual_tab_capture", streamState: "inactive", tabId: 1 },
          { engineLane: "manual_tab_capture", streamState: "active", tabId: 7 }
        ]
      },
      7
    )
  ).toBe(true);
  expect(hasManualSession({ sessions: [{ engineLane: "manual_tab_capture", streamState: "idle", tabId: 7 }] }, 7)).toBe(
    false
  );
});
