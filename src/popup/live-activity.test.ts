import { deriveLiveActivityPercent } from "./live-activity";

describe("deriveLiveActivityPercent", () => {
  it("returns 0 when there is no activity", () => {
    expect(deriveLiveActivityPercent(0)).toBe(0);
    expect(deriveLiveActivityPercent(null)).toBe(0);
    expect(deriveLiveActivityPercent(undefined)).toBe(0);
  });

  it("rounds normalized activity into percentage points", () => {
    expect(deriveLiveActivityPercent(0.084)).toBe(8);
    expect(deriveLiveActivityPercent(0.126)).toBe(13);
    expect(deriveLiveActivityPercent(0.5)).toBe(50);
  });

  it("clamps out-of-range values into the visible 0..100 interval", () => {
    expect(deriveLiveActivityPercent(-0.5)).toBe(0);
    expect(deriveLiveActivityPercent(1.4)).toBe(100);
  });
});
