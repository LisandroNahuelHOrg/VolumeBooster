import { getDomainFromUrl } from "../../../shared/domain";
import { fail, message, ok, type PopupCommand } from "../../../shared/messages";
import type { AutoBoosterDebugState, RuntimeResponse, WorkerState } from "../../../shared/types";
import type { WorkerRuntimeState } from "../runtime-state";
import { enableCurrentTabBooster } from "../auto/enable-current-tab-booster";
import { disableCurrentTabBooster } from "../auto/disable-current-tab-booster";
import { enableGlobalAutoBooster } from "../auto/enable-global-auto-booster";
import { disableGlobalAutoBooster } from "../auto/disable-global-auto-booster";
import { validateTabForAutoBooster } from "../auto/validate-tab-for-auto-booster";
import { applySessionBoostToAllSites } from "../session-boost/apply-session-boost-to-all-sites";
import { applySessionBoostToSite } from "../session-boost/apply-session-boost-to-site";
import { dismissSessionBoostPrompt } from "../session-boost/dismiss-session-boost-prompt";
import { resetSessionBoostOnAllSites } from "../session-boost/reset-session-boost-on-all-sites";
import { resetSessionBoostOnSite } from "../session-boost/reset-session-boost-on-site";
import { setSessionBoostBundle } from "../session-boost/set-session-boost-bundle";
import { getDebugState } from "../state/get-debug-state";
import { getState } from "../state/get-state";
import { toErrorMessage } from "../state/to-error-message";
import { removeDomainGain } from "../manual/remove-domain-gain";
import { saveDomainGain } from "../manual/save-domain-gain";
import { setAdvancedAudioSettings } from "../manual/set-advanced-audio-settings";
import { setGain } from "../manual/set-gain";
import { startCapture } from "../manual/start-capture";
import { stopAll } from "../manual/stop-all";
import { stopCapture } from "../manual/stop-capture";

export async function handlePopupCommand(
  runtime: WorkerRuntimeState,
  command: PopupCommand
): Promise<RuntimeResponse<WorkerState | AutoBoosterDebugState | null>> {
  try {
    switch (command.type) {
      case "GET_STATE":
      case "GET_ADVANCED_AUDIO_SETTINGS":
        return ok(await getState(runtime));
      case "SET_SESSION_BOOST_BUNDLE":
        await setSessionBoostBundle(runtime, command.payload.tabId, command.payload.bundle);
        return ok(await getState(runtime));
      case "APPLY_SESSION_BOOST_TO_SITE":
        await applySessionBoostToSite(runtime, command.payload.tabId);
        return ok(await getState(runtime));
      case "APPLY_SESSION_BOOST_TO_ALL_SITES": {
        const targetTab = await chrome.tabs.get(command.payload.tabId).catch(() => null);
        await applySessionBoostToAllSites(runtime, getDomainFromUrl(targetTab?.url));
        return ok(await getState(runtime));
      }
      case "RESET_SESSION_BOOST_ON_SITE":
        await resetSessionBoostOnSite(runtime, command.payload.tabId);
        return ok(await getState(runtime));
      case "RESET_SESSION_BOOST_ON_ALL_SITES":
        await resetSessionBoostOnAllSites(runtime);
        return ok(await getState(runtime));
      case "DISMISS_SESSION_BOOST_PROMPT":
        await dismissSessionBoostPrompt(runtime);
        return ok(await getState(runtime));
      case "GET_DEBUG_STATE":
        return ok(await getDebugState(runtime, command.payload.tabId));
      case "REQUEST_SITE_PERMISSION":
        await validateTabForAutoBooster(command.payload.tabId);
        return ok(await getState(runtime));
      case "REQUEST_GLOBAL_PERMISSION": {
        const granted = await runtime.autoBoosterClient.requestGlobalPermission();

        if (!granted) {
          return fail(message("errorAutoGlobalPermissionDenied"));
        }

        return ok(await getState(runtime));
      }
      case "ENABLE_CURRENT_TAB_BOOSTER":
        await enableCurrentTabBooster(runtime, command.payload.tabId, command.payload.gainPercent);
        return ok(await getState(runtime));
      case "DISABLE_CURRENT_TAB_BOOSTER":
        await disableCurrentTabBooster(runtime, command.payload.tabId);
        return ok(await getState(runtime));
      case "ENABLE_GLOBAL_AUTO_BOOSTER":
        await enableGlobalAutoBooster(runtime, command.payload.tabId, command.payload.gainPercent);
        return ok(await getState(runtime));
      case "DISABLE_GLOBAL_AUTO_BOOSTER":
        await disableGlobalAutoBooster(runtime);
        return ok(await getState(runtime));
      case "START_CAPTURE":
        await startCapture(runtime, command.payload.tabId, command.payload.gainPercent);
        return ok(await getState(runtime));
      case "SET_GAIN":
        await setGain(runtime, command.payload.tabId, command.payload.gainPercent);
        return ok(await getState(runtime));
      case "SAVE_DOMAIN_GAIN":
        await saveDomainGain(runtime, command.payload.tabId, command.payload.gainPercent);
        return ok(await getState(runtime));
      case "REMOVE_DOMAIN_GAIN":
        await removeDomainGain(runtime, command.payload.tabId);
        return ok(await getState(runtime));
      case "SET_ADVANCED_AUDIO_SETTINGS":
        await setAdvancedAudioSettings(runtime, command.payload);
        return ok(await getState(runtime));
      case "STOP_CAPTURE":
        await stopCapture(runtime, command.payload.tabId);
        return ok(await getState(runtime));
      case "STOP_ALL":
        await stopAll(runtime);
        return ok(await getState(runtime));
    }
  } catch (error) {
    return fail(toErrorMessage(error));
  }
}
