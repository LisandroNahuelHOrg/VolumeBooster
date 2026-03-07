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
/** Storage key used to persist extension settings in `chrome.storage.local`. */
export const SETTINGS_STORAGE_KEY = "prismVolumeBoosterSettings";
/** Path to the hidden offscreen document that owns manual capture audio graphs. */
export const OFFSCREEN_DOCUMENT_PATH = "offscreen.html";
/** Chrome-required explanation for why the extension needs an offscreen document. */
export const OFFSCREEN_JUSTIFICATION =
  "Process captured tab audio in a hidden document so volume boosting survives popup close.";
/** Sampling interval, in milliseconds, for live audio meter updates. */
export const METER_SAMPLE_MS = 20;
/** Built isolated-world bundle used for global auto-boost content injection. */
export const AUTO_BOOSTER_CONTENT_SCRIPT_PATH = "assets/auto-booster.js";
/** Built main-world bundle kept for future bridge experiments. */
export const AUTO_BOOSTER_MAIN_WORLD_SCRIPT_PATH = "assets/auto-booster-main.js";
/** Public loader injected into tabs for the isolated auto-booster lane. */
export const AUTO_BOOSTER_ISOLATED_LOADER_PATH = "auto-booster-loader.js";
/** Public loader injected into tabs for the main-world bridge lane. */
export const AUTO_BOOSTER_MAIN_WORLD_LOADER_PATH = "auto-booster-main-loader.js";
/** Registered content-script id for the isolated auto-booster loader. */
export const AUTO_BOOSTER_ISOLATED_SCRIPT_ID = "prism-auto-booster-isolated";
/** Registered content-script id for the main-world bridge loader. */
export const AUTO_BOOSTER_MAIN_WORLD_SCRIPT_ID = "prism-auto-booster-main";
/** Duration of in-page failure toasts shown by the automatic booster lane. */
export const AUTO_BOOSTER_FAILURE_TOAST_MS = 6000;
/** Delay used by experimental global recovery logic before a forced reload. */
export const AUTO_BOOSTER_RECOVERY_RELOAD_DELAY_MS = 600;
/** Feature flag for the experimental main-world Web Audio bridge. */
export const AUTO_BOOSTER_ENABLE_MAIN_WORLD_BRIDGE = false;
