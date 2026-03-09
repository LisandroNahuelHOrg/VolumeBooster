import type { CaptureSessionState } from "../shared/types";
import {
  buildSessionCarouselModel,
  clampSessionCarouselOffset,
  shiftSessionCarouselOffset
} from "./session-carousel";

function makeSession(tabId: number): CaptureSessionState {
  return {
    tabId,
    title: `Tab ${tabId}`,
    domain: `site${tabId}.example`,
    gainPercent: 100 + tabId,
    engineLane: "manual_tab_capture",
    autoAttachState: "idle",
    streamState: "active",
    engineStatus: "ready",
    level: 0.5,
    warning: "none",
    protectorActionDb: 3,
    clipEvents: 0,
    clipPeak: 0,
    protectionBypassed: false,
    outputPeak: 0.6,
    updatedAt: tabId
  };
}

describe("buildSessionCarouselModel", () => {
  it("renders three premium placeholders when there are no active sessions", () => {
    const carousel = buildSessionCarouselModel([], 0);

    expect(carousel.offset).toBe(0);
    expect(carousel.showNavigation).toBe(false);
    expect(carousel.canScrollPrevious).toBe(false);
    expect(carousel.canScrollNext).toBe(false);
    expect(carousel.items).toHaveLength(3);
    expect(carousel.visibleItems).toHaveLength(3);
    expect(carousel.items.every((item) => item.kind === "placeholder")).toBe(true);
  });

  it("fills missing visible slots with placeholders when fewer than three sessions exist", () => {
    const carousel = buildSessionCarouselModel([makeSession(1), makeSession(2)], 0);

    expect(carousel.items).toHaveLength(3);
    expect(carousel.visibleItems.map((item) => item.kind)).toEqual(["session", "session", "placeholder"]);
  });

  it("shows exactly three real cards with no placeholders when three sessions exist", () => {
    const carousel = buildSessionCarouselModel([makeSession(1), makeSession(2), makeSession(3)], 0);

    expect(carousel.showNavigation).toBe(false);
    expect(carousel.items).toHaveLength(3);
    expect(carousel.items.every((item) => item.kind === "session")).toBe(true);
  });

  it("supports horizontal pagination one column at a time when more than three sessions exist", () => {
    const sessions = [makeSession(1), makeSession(2), makeSession(3), makeSession(4)];
    const initialCarousel = buildSessionCarouselModel(sessions, 0);
    const nextOffset = shiftSessionCarouselOffset(sessions.length, initialCarousel.offset, "next");
    const nextCarousel = buildSessionCarouselModel(sessions, nextOffset);

    expect(initialCarousel.showNavigation).toBe(true);
    expect(initialCarousel.canScrollNext).toBe(true);
    expect(initialCarousel.visibleItems.map((item) => item.kind === "session" ? item.session.tabId : 0)).toEqual([1, 2, 3]);
    expect(nextCarousel.offset).toBe(1);
    expect(nextCarousel.canScrollPrevious).toBe(true);
    expect(nextCarousel.canScrollNext).toBe(false);
    expect(nextCarousel.visibleItems.map((item) => item.kind === "session" ? item.session.tabId : 0)).toEqual([2, 3, 4]);
  });

  it("clamps the offset back into range when the session count shrinks", () => {
    expect(clampSessionCarouselOffset(5, 2)).toBe(2);
    expect(clampSessionCarouselOffset(2, 2)).toBe(0);

    const carousel = buildSessionCarouselModel([makeSession(1), makeSession(2)], 2);

    expect(carousel.offset).toBe(0);
    expect(carousel.visibleItems).toHaveLength(3);
  });
});
