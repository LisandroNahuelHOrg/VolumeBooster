import type { PopupDynamicUiModel } from "./popup-dynamic-ui-types";

export function syncSessionCards(rootElement: HTMLElement, model: PopupDynamicUiModel): void {
  for (const session of model.sessionCards) {
    const sessionCard = rootElement.querySelector<HTMLElement>(`[data-session-tab='${session.tabId}']`);

    if (!sessionCard) {
      continue;
    }

    const sessionStatusDot = sessionCard.querySelector<HTMLElement>(".session-card__status-dot");
    const sessionFooterText = sessionCard.querySelector<HTMLElement>(".session-card__footer-text");
    const sessionGain = sessionCard.querySelector<HTMLElement>("[data-role='session-gain']");
    const sessionLevel = sessionCard.querySelector<HTMLElement>("[data-role='session-level']");
    const sessionLevelMeter = sessionCard.querySelector<HTMLElement>("[data-role='session-level-meter']");
    const sessionWarning = sessionCard.querySelector<HTMLElement>("[data-role='session-warning']");
    const sessionProtectionAction = sessionCard.querySelector<HTMLElement>("[data-role='session-protection-action']");
    const sessionClipEvents = sessionCard.querySelector<HTMLElement>("[data-role='session-clip-events']");
    const sessionMeterFill = sessionCard.querySelector<HTMLElement>("[data-role='session-meter-fill']");

    if (sessionStatusDot) {
      sessionStatusDot.dataset.state = session.visualStatus;
    }
    if (sessionFooterText) {
      sessionFooterText.textContent = session.statusText;
    }
    if (sessionGain) {
      sessionGain.textContent = session.gainText;
    }
    if (sessionLevel) {
      sessionLevel.textContent = session.levelText;
    }
    if (sessionLevelMeter) {
      sessionLevelMeter.textContent = session.levelText;
    }
    if (sessionWarning) {
      sessionWarning.dataset.warning = session.warningTone;
      sessionWarning.textContent = session.warningText;
    }
    if (sessionProtectionAction) {
      sessionProtectionAction.textContent = session.protectionActionText;
    }
    if (sessionClipEvents) {
      sessionClipEvents.textContent = session.clipEventsText;
    }
    if (sessionMeterFill) {
      sessionMeterFill.style.width = `${session.meterWidthPercent}%`;
    }
  }
}
