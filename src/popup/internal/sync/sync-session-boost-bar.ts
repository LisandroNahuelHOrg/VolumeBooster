import type { PopupDomRuntime } from "../dom/popup-dom-runtime-types";
import type { PopupUiSyncRuntime } from "./popup-dynamic-ui-types";

export function syncSessionBoostBar(
  rootElement: HTMLElement,
  sessionBoostVisible: boolean,
  sessionBoostAcknowledgedAction: string | null,
  syncRuntime: PopupUiSyncRuntime,
  domRuntime: PopupDomRuntime
): void {
  const sessionBoostBar = rootElement.querySelector<HTMLElement>('[data-role="session-boost-bar"]');
  const feedbackActive = sessionBoostAcknowledgedAction !== null;

  if (domRuntime.sessionBoostBarRevealFrame !== null) {
    cancelAnimationFrame(domRuntime.sessionBoostBarRevealFrame);
    domRuntime.sessionBoostBarRevealFrame = null;
  }

  if (!sessionBoostBar) {
    syncRuntime.lastSessionBoostVisible = false;
    return;
  }

  for (const button of sessionBoostBar.querySelectorAll<HTMLButtonElement>(".session-boost-bar__button")) {
    button.classList.toggle("is-acknowledged", button.dataset.action === sessionBoostAcknowledgedAction);
  }

  sessionBoostBar.setAttribute("data-feedback-locked", feedbackActive ? "true" : "false");
  const shouldShow = sessionBoostVisible || feedbackActive;

  if (!shouldShow) {
    sessionBoostBar.classList.remove("is-visible");
    sessionBoostBar.setAttribute("aria-hidden", "true");
    sessionBoostBar.setAttribute("inert", "");
    syncRuntime.lastSessionBoostVisible = false;
    return;
  }

  if (syncRuntime.lastSessionBoostVisible) {
    sessionBoostBar.classList.add("is-visible");
    sessionBoostBar.setAttribute("aria-hidden", "false");
    if (feedbackActive) {
      sessionBoostBar.setAttribute("inert", "");
    } else {
      sessionBoostBar.removeAttribute("inert");
    }
    syncRuntime.lastSessionBoostVisible = true;
    return;
  }

  sessionBoostBar.classList.remove("is-visible");
  sessionBoostBar.setAttribute("aria-hidden", "true");
  sessionBoostBar.setAttribute("inert", "");
  domRuntime.sessionBoostBarRevealFrame = requestAnimationFrame(() => {
    domRuntime.sessionBoostBarRevealFrame = null;

    if (!sessionBoostBar.isConnected) {
      return;
    }

    sessionBoostBar.classList.add("is-visible");
    sessionBoostBar.setAttribute("aria-hidden", "false");
    if (feedbackActive) {
      sessionBoostBar.setAttribute("inert", "");
    } else {
      sessionBoostBar.removeAttribute("inert");
    }
    syncRuntime.lastSessionBoostVisible = true;
  });
}
