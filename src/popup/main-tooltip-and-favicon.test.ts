// @vitest-environment happy-dom

import { createPopupMainHarness } from "./test-support/create-popup-main-harness";
import { flushPopupMainMicrotasks } from "./test-support/flush-popup-main-microtasks";
import { makePopupMainState } from "./test-support/make-popup-main-state";

test("shows and hides the floating tooltip and falls back when the favicon fails", async () => {
  const harness = createPopupMainHarness();
  harness.sendMessageSafeMock.mockImplementation(async (command: { type: string }) => {
    if (command.type === "GET_STATE") {
      return {
        ok: true,
        data: makePopupMainState({
          currentTab: {
            tabId: 7,
            title: "Video",
            url: "https://video.example",
            domain: "video.example",
            favIconUrl: "https://video.example/favicon.ico",
            supported: true,
            preferredGainPercent: 100,
            hasStoredPreference: false,
            autoAttachState: "idle"
          }
        })
      };
    }

    return { ok: true, data: null };
  });

  await harness.importPopupMain();

  const helpWrap = document.querySelector<HTMLElement>(".telemetry-pill__help-wrap");
  const tooltip = document.querySelector<HTMLElement>(".floating-help-tooltip");
  const faviconImage = document.querySelector<HTMLImageElement>("[data-role='site-favicon-image']");

  if (!helpWrap || !tooltip || !faviconImage) {
    throw new Error("Expected tooltip and favicon nodes to be rendered.");
  }

  helpWrap.dispatchEvent(new MouseEvent("mouseover", { bubbles: true }));
  await flushPopupMainMicrotasks();
  expect(tooltip.dataset.visible).toBe("true");

  helpWrap.dispatchEvent(new MouseEvent("mouseout", { bubbles: true }));
  await flushPopupMainMicrotasks();
  expect(tooltip.dataset.visible).toBe("false");

  faviconImage.dispatchEvent(new Event("error", { bubbles: true }));
  await flushPopupMainMicrotasks();
  expect(document.querySelector<HTMLElement>("[data-role='site-favicon']")?.dataset.broken).toBe("true");

  vi.useRealTimers();
  vi.unstubAllGlobals();
});
