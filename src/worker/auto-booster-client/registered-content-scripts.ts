import {
  AUTO_BOOSTER_CONTENT_SCRIPT_PATH,
  AUTO_BOOSTER_ISOLATED_SCRIPT_ID,
  AUTO_BOOSTER_MAIN_WORLD_SCRIPT_ID,
  AUTO_BOOSTER_MAIN_WORLD_SCRIPT_PATH,
  AUTO_BOOSTER_REGISTERED_MATCHES
} from "../../shared/constants";

export const AUTO_BOOSTER_REGISTERED_SCRIPT_IDS = [
  AUTO_BOOSTER_ISOLATED_SCRIPT_ID,
  AUTO_BOOSTER_MAIN_WORLD_SCRIPT_ID
] as const;

export const AUTO_BOOSTER_REGISTERED_CONTENT_SCRIPTS = [
  {
    id: AUTO_BOOSTER_ISOLATED_SCRIPT_ID,
    js: [AUTO_BOOSTER_CONTENT_SCRIPT_PATH],
    matches: [...AUTO_BOOSTER_REGISTERED_MATCHES],
    allFrames: true,
    matchOriginAsFallback: true,
    persistAcrossSessions: true,
    runAt: "document_start",
    world: "ISOLATED"
  },
  {
    id: AUTO_BOOSTER_MAIN_WORLD_SCRIPT_ID,
    js: [AUTO_BOOSTER_MAIN_WORLD_SCRIPT_PATH],
    matches: [...AUTO_BOOSTER_REGISTERED_MATCHES],
    allFrames: true,
    matchOriginAsFallback: true,
    persistAcrossSessions: true,
    runAt: "document_start",
    world: "MAIN"
  }
] satisfies chrome.scripting.RegisteredContentScript[];
