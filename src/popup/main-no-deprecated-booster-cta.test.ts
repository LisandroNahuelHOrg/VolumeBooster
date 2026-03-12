// @vitest-environment happy-dom

import { createPopupMainHarness } from "./test-support/create-popup-main-harness";
import { makePopupMainState } from "./test-support/make-popup-main-state";

test("does not render the deprecated activate booster CTA in the popup", async () => {
  const harness = createPopupMainHarness();

  harness.sendMessageSafeMock.mockImplementation(async (command: { type: string }) => {
    if (command.type === "GET_STATE") {
      return {
        ok: true,
        data: makePopupMainState({
          currentTab: {
            tabId: 91,
            title: "FocusStream",
            url: "https://example.com/watch",
            domain: "example.com",
            supported: true,
            preferredGainPercent: 175,
            hasStoredPreference: false,
            autoAttachState: "idle"
          }
        })
      };
    }

    return { ok: true, data: null };
  });

  await harness.importPopupMain();

  expect(document.querySelector("[data-role='toggle-current']")).toBeNull();
  expect(document.body.textContent).not.toContain("Activate booster");
  expect(harness.sendMessageSafeMock).toHaveBeenCalledTimes(1);
});
