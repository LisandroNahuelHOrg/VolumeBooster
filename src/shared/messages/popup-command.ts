import type { BoostSettingsBundle } from "../boost-settings";
import type { AdvancedAudioSettings } from "../types";

/** Commands sent from popup UI to the worker. */
export type PopupCommand =
  | { type: "GET_STATE" }
  | { type: "GET_DEBUG_STATE"; payload: { tabId: number } }
  | { type: "SET_SESSION_BOOST_BUNDLE"; payload: { tabId: number; bundle: BoostSettingsBundle } }
  | { type: "APPLY_SESSION_BOOST_TO_SITE"; payload: { tabId: number } }
  | { type: "APPLY_SESSION_BOOST_TO_ALL_SITES"; payload: { tabId: number } }
  | { type: "RESET_SESSION_BOOST_ON_SITE"; payload: { tabId: number } }
  | { type: "RESET_SESSION_BOOST_ON_ALL_SITES"; payload: { tabId: number } }
  | { type: "DISMISS_SESSION_BOOST_PROMPT" }
  | { type: "START_CAPTURE"; payload: { tabId: number; gainPercent: number } }
  | { type: "ENABLE_CURRENT_TAB_BOOSTER"; payload: { tabId: number; gainPercent: number } }
  | { type: "DISABLE_CURRENT_TAB_BOOSTER"; payload: { tabId: number } }
  | { type: "ENABLE_GLOBAL_AUTO_BOOSTER"; payload: { tabId: number; gainPercent: number } }
  | { type: "DISABLE_GLOBAL_AUTO_BOOSTER" }
  | { type: "REQUEST_SITE_PERMISSION"; payload: { tabId: number } }
  | { type: "REQUEST_GLOBAL_PERMISSION" }
  | { type: "SET_GAIN"; payload: { tabId: number; gainPercent: number } }
  | { type: "SAVE_DOMAIN_GAIN"; payload: { tabId: number; gainPercent: number } }
  | { type: "REMOVE_DOMAIN_GAIN"; payload: { tabId: number } }
  | { type: "GET_ADVANCED_AUDIO_SETTINGS" }
  | { type: "SET_ADVANCED_AUDIO_SETTINGS"; payload: Partial<AdvancedAudioSettings> }
  | { type: "STOP_CAPTURE"; payload: { tabId: number } }
  | { type: "STOP_ALL" };
