import { closePopupSettingsView } from "../commands/close-popup-settings-view";
import { disablePopupCurrentTabBooster } from "../commands/disable-popup-current-tab-booster";
import { disablePopupGlobalAutoBooster } from "../commands/disable-popup-global-auto-booster";
import { enablePopupCurrentTabBooster } from "../commands/enable-popup-current-tab-booster";
import { enablePopupGlobalAutoBooster } from "../commands/enable-popup-global-auto-booster";
import { handlePopupThemeToggle } from "../commands/handle-popup-theme-toggle";
import { openPopupSettingsView } from "../commands/open-popup-settings-view";
import { requestPopupGlobalAutoPermission } from "../commands/request-popup-global-auto-permission";
import { stopPopupSessions } from "../commands/stop-popup-sessions";
import { togglePopupCurrentSitePreference } from "../commands/toggle-popup-current-site-preference";
import type { PopupCommandContext } from "../commands/popup-command-context";

export function runPopupRootAction(
  action: string,
  context: PopupCommandContext
): void {
  const tabId = context.state.currentState?.currentTab?.tabId;

  switch (action) {
    case "premium-mock":
      return;
    case "toggle-popup-theme":
      handlePopupThemeToggle(context);
      return;
    case "open-popup-settings":
      openPopupSettingsView(context);
      return;
    case "close-popup-settings":
      closePopupSettingsView(context);
      return;
    case "stop-all":
      void stopPopupSessions(context);
      return;
    case "toggle-current-site":
      if (tabId) {
        void togglePopupCurrentSitePreference(context, tabId);
      }
      return;
    case "enable-site-auto":
      if (tabId) {
        void enablePopupCurrentTabBooster(context, tabId);
      }
      return;
    case "disable-site-auto":
      if (tabId) {
        void disablePopupCurrentTabBooster(context, tabId);
      }
      return;
    case "enable-global-auto":
      if (tabId) {
        void enablePopupGlobalAutoBooster(context, tabId);
      }
      return;
    case "request-global-auto-permission":
      void requestPopupGlobalAutoPermission(context);
      return;
    case "disable-global-auto":
      void disablePopupGlobalAutoBooster(context);
      return;
  }
}
