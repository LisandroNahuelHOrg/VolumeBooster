/**
 * @fileoverview Shared compile-time constants used across popup, worker,
 * content, and offscreen contexts.
 * @module shared/constants
 */

/** Default boost value shown to users and persisted when no override exists. */
export const DEFAULT_GAIN_PERCENT = 100;
/** Hard upper bound exposed by the UI and runtime boost pipeline. */
export const MAX_GAIN_PERCENT = 10000;
/** Legacy upper bound used to keep old boost mapping behavior stable. */
export const LEGACY_MAX_GAIN_PERCENT = 1000;
/** Smallest valid boost value accepted by the extension. */
export const MIN_GAIN_PERCENT = 100;
/** Media query used to honor reduced-motion user preferences in interactive UI. */
export const REDUCED_MOTION_MEDIA_QUERY = "(prefers-reduced-motion: reduce)";
/** Shared easing curve for premium popup layout transitions. */
export const POPUP_PREMIUM_EASING = "cubic-bezier(0.22, 1, 0.36, 1)";
/** Starting transform used for premium lane transition entrance. */
export const POPUP_LANE_TRANSITION_FROM = "translateY(6px) scale(0.985)";
/** Ending transform used for premium lane transition entrance. */
export const POPUP_LANE_TRANSITION_TO = "translateY(0) scale(1)";
/** Storage key used to persist extension settings in `chrome.storage.local`. */
export const SETTINGS_STORAGE_KEY = "prismVolumeBoosterSettings";
/** Path to the hidden offscreen document that owns manual capture audio graphs. */
export const OFFSCREEN_DOCUMENT_PATH = "offscreen.html";
/** Chrome-required explanation for why the extension needs an offscreen document. */
export const OFFSCREEN_JUSTIFICATION =
  "Process captured tab audio in a hidden document so volume boosting survives popup close.";
/** Sampling interval, in milliseconds, for live audio meter updates. */
export const METER_SAMPLE_MS = 20;
/** URL patterns targeted by the registered multi-frame global auto-booster runtime. */
export const AUTO_BOOSTER_REGISTERED_MATCHES = ["http://*/*", "https://*/*"] as const;
/** Built isolated-world bundle used for registered global auto-boost injection. */
export const AUTO_BOOSTER_CONTENT_SCRIPT_PATH = "content-scripts/auto-booster-isolated.js";
/** Built main-world bundle used for registered global Web Audio bridge injection. */
export const AUTO_BOOSTER_MAIN_WORLD_SCRIPT_PATH = "content-scripts/auto-booster-main.js";
/** Registered content-script id for the isolated auto-booster runtime. */
export const AUTO_BOOSTER_ISOLATED_SCRIPT_ID = "prism-auto-booster-isolated";
/** Registered content-script id for the main-world bridge runtime. */
export const AUTO_BOOSTER_MAIN_WORLD_SCRIPT_ID = "prism-auto-booster-main";
/** DOM id used by the persistent in-page fallback toast. */
export const AUTO_BOOSTER_FALLBACK_TOAST_ID = "prism-auto-booster-fallback-toast";
