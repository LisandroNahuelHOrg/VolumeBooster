/**
 * @fileoverview Exercises boost percentage conversion, clamping, and warning
 * derivation helpers.
 * @module shared/gain.test
 */

import { clampGainPercent, deriveWarning, gainPercentToValue, gainValueToPercent } from "./gain";

describe("gain helpers", () => {
  it("clamps gain percentages to the supported range", () => {
    expect(clampGainPercent(40)).toBe(100);
    expect(clampGainPercent(255.4)).toBe(255);
    expect(clampGainPercent(1400)).toBe(1400);
    expect(clampGainPercent(12000)).toBe(10000);
    expect(clampGainPercent(Number.NaN)).toBe(100);
    expect(clampGainPercent(Number.POSITIVE_INFINITY)).toBe(100);
    expect(clampGainPercent(Number.NEGATIVE_INFINITY)).toBe(100);
  });

  it("converts between gain percent and numeric gain values", () => {
    expect(gainPercentToValue(275)).toBe(2.75);
    expect(gainPercentToValue(40)).toBe(1);
    expect(gainValueToPercent(4.02)).toBe(402);
    expect(gainValueToPercent(0.4)).toBe(100);
    expect(gainValueToPercent(120)).toBe(10000);
  });

  it("flags warning levels based on gain and measured activity", () => {
    expect(deriveWarning(180, 0.2)).toBe("none");
    expect(deriveWarning(450, 0.35)).toBe("high");
    expect(deriveWarning(800, 0.9)).toBe("danger");
    expect(deriveWarning(437, 0.2)).toBe("none");
    expect(deriveWarning(438, 0.2)).toBe("high");
    expect(deriveWarning(594, 0.82)).toBe("high");
    expect(deriveWarning(595, 0.82)).toBe("danger");
    expect(deriveWarning(774, 0.2)).toBe("high");
    expect(deriveWarning(775, 0.2)).toBe("danger");
    expect(deriveWarning(180, 0.679)).toBe("none");
    expect(deriveWarning(180, 0.68)).toBe("high");
  });
});
