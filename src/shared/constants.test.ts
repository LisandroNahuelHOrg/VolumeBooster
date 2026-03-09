/**
 * @fileoverview Exact contract tests for shared compile-time constants.
 */
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import {
  AUTO_BOOSTER_CONTENT_SCRIPT_PATH,
  AUTO_BOOSTER_FALLBACK_TOAST_ID,
  AUTO_BOOSTER_ISOLATED_SCRIPT_ID,
  AUTO_BOOSTER_MAIN_WORLD_SCRIPT_ID,
  AUTO_BOOSTER_MAIN_WORLD_SCRIPT_PATH,
  AUTO_BOOSTER_REGISTERED_MATCHES,
  DEFAULT_GAIN_PERCENT,
  LEGACY_MAX_GAIN_PERCENT,
  MAX_GAIN_PERCENT,
  METER_SAMPLE_MS,
  MIN_GAIN_PERCENT,
  OFFSCREEN_DOCUMENT_PATH,
  OFFSCREEN_JUSTIFICATION,
  POPUP_LANE_TRANSITION_FROM,
  POPUP_LANE_TRANSITION_TO,
  POPUP_PREMIUM_EASING,
  REDUCED_MOTION_MEDIA_QUERY,
  SETTINGS_STORAGE_KEY
} from "./constants";

describe("shared constants", () => {
  it("exposes the exact boost bounds and popup motion contract", () => {
    expect({
      DEFAULT_GAIN_PERCENT,
      MIN_GAIN_PERCENT,
      LEGACY_MAX_GAIN_PERCENT,
      MAX_GAIN_PERCENT,
      REDUCED_MOTION_MEDIA_QUERY,
      POPUP_PREMIUM_EASING,
      POPUP_LANE_TRANSITION_FROM,
      POPUP_LANE_TRANSITION_TO,
      METER_SAMPLE_MS
    }).toEqual({
      DEFAULT_GAIN_PERCENT: 100,
      MIN_GAIN_PERCENT: 100,
      LEGACY_MAX_GAIN_PERCENT: 1000,
      MAX_GAIN_PERCENT: 10000,
      REDUCED_MOTION_MEDIA_QUERY: "(prefers-reduced-motion: reduce)",
      POPUP_PREMIUM_EASING: "cubic-bezier(0.22, 1, 0.36, 1)",
      POPUP_LANE_TRANSITION_FROM: "translateY(6px) scale(0.985)",
      POPUP_LANE_TRANSITION_TO: "translateY(0) scale(1)",
      METER_SAMPLE_MS: 20
    });
  });

  it("exposes the exact storage, offscreen, content-script and toast identifiers", () => {
    expect({
      SETTINGS_STORAGE_KEY,
      OFFSCREEN_DOCUMENT_PATH,
      OFFSCREEN_JUSTIFICATION,
      AUTO_BOOSTER_REGISTERED_MATCHES: [...AUTO_BOOSTER_REGISTERED_MATCHES],
      AUTO_BOOSTER_CONTENT_SCRIPT_PATH,
      AUTO_BOOSTER_MAIN_WORLD_SCRIPT_PATH,
      AUTO_BOOSTER_ISOLATED_SCRIPT_ID,
      AUTO_BOOSTER_MAIN_WORLD_SCRIPT_ID,
      AUTO_BOOSTER_FALLBACK_TOAST_ID
    }).toEqual({
      SETTINGS_STORAGE_KEY: "prismVolumeBoosterSettings",
      OFFSCREEN_DOCUMENT_PATH: "offscreen.html",
      OFFSCREEN_JUSTIFICATION:
        "Process captured tab audio in a hidden document so volume boosting survives popup close.",
      AUTO_BOOSTER_REGISTERED_MATCHES: ["http://*/*", "https://*/*"],
      AUTO_BOOSTER_CONTENT_SCRIPT_PATH: "content-scripts/auto-booster-isolated.js",
      AUTO_BOOSTER_MAIN_WORLD_SCRIPT_PATH: "content-scripts/auto-booster-main.js",
      AUTO_BOOSTER_ISOLATED_SCRIPT_ID: "prism-auto-booster-isolated",
      AUTO_BOOSTER_MAIN_WORLD_SCRIPT_ID: "prism-auto-booster-main",
      AUTO_BOOSTER_FALLBACK_TOAST_ID: "prism-auto-booster-fallback-toast"
    });
  });

  it("keeps the source-level string contract intact for runtime wiring", () => {
    const source = readFileSync(fileURLToPath(new URL("./constants.ts", import.meta.url)), "utf8");

    expect(source).toContain("(prefers-reduced-motion: reduce)");
    expect(source).toContain("cubic-bezier(0.22, 1, 0.36, 1)");
    expect(source).toContain("translateY(6px) scale(0.985)");
    expect(source).toContain("translateY(0) scale(1)");
    expect(source).toContain("prismVolumeBoosterSettings");
    expect(source).toContain("offscreen.html");
    expect(source).toContain(
      "Process captured tab audio in a hidden document so volume boosting survives popup close."
    );
    expect(source).toContain("content-scripts/auto-booster-isolated.js");
    expect(source).toContain("content-scripts/auto-booster-main.js");
    expect(source).toContain("prism-auto-booster-isolated");
    expect(source).toContain("prism-auto-booster-main");
    expect(source).toContain("prism-auto-booster-fallback-toast");
  });
});
