import { deriveLiveActivityPercent, deriveSessionMeterWidthPercent } from "./live-activity";

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

describe("deriveSessionMeterWidthPercent", () => {
  it("returns 0 when there is no valid visible activity", () => {
    expect(deriveSessionMeterWidthPercent(null)).toBe(0);
    expect(deriveSessionMeterWidthPercent(undefined)).toBe(0);
    expect(deriveSessionMeterWidthPercent(Number.NaN)).toBe(0);
    expect(deriveSessionMeterWidthPercent(0)).toBe(0);
  });

  it("keeps the fill within the same clamped range while preserving a minimum visible bar", () => {
    expect(deriveSessionMeterWidthPercent(0.02)).toBe(8);
    expect(deriveSessionMeterWidthPercent(0.084)).toBe(8);
    expect(deriveSessionMeterWidthPercent(0.26)).toBe(26);
    expect(deriveSessionMeterWidthPercent(1.4)).toBe(100);
  });
});
