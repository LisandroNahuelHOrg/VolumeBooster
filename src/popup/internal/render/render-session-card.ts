import { t, translate, type UiCatalog } from "../../../shared/runtime-i18n";
import type { CaptureSessionState } from "../../../shared/types";
import { formatLevelPercent } from "../format/format-level-percent";
import { formatProtectionAction } from "../format/format-protection-action";
import { statusCopy } from "../copy/status-copy";
import { warningCopy } from "../copy/warning-copy";
import { getVisualStatus } from "../status/get-visual-status";
import { escapeHtml } from "../util/escape-html";
import { renderSiteFavicon } from "./render-site-favicon";
import { deriveSessionMeterWidthPercent } from "../../live-activity";

export function renderSessionCard(
  session: CaptureSessionState,
  currentTabId: number | undefined,
  catalog: UiCatalog | null
): string {
  if (!catalog) {
    return "";
  }

  const levelPercent = formatLevelPercent(session.level);
  const meterWidth = deriveSessionMeterWidthPercent(session.level);
  const isCurrentTabSession = currentTabId === session.tabId;
  const visualStatus = getVisualStatus(session, true);
  const protectionAction = formatProtectionAction(
    session.protectorActionDb,
    session.protectionBypassed,
    catalog
  );

  return `
    <article class="session-card ${isCurrentTabSession ? "session-card--current" : ""}" data-session-tab="${session.tabId}">
      <div class="session-card__top">
        <div class="session-card__identity">
          ${renderSiteFavicon(session.title, session.domain, "small")}
          <div class="session-card__copy">
            <div class="session-card__title-row">
              <h4 class="session-card__title">${escapeHtml(session.title)}</h4>
              ${
                isCurrentTabSession
                  ? `<span class="session-card__current-badge">${escapeHtml(
                      translate(catalog, "currentTabLabel")
                    )}</span>`
                  : ""
              }
            </div>
            <div class="session-card__domain">${escapeHtml(session.domain || session.url || t("webLabel"))}</div>
          </div>
        </div>
      </div>
      <div class="session-card__metrics">
        <div class="session-stat"><span class="session-stat__label">${escapeHtml(translate(catalog, "boostLabel"))}</span><strong class="session-stat__value" data-role="session-gain">${session.gainPercent}%</strong></div>
        <div class="session-stat"><span class="session-stat__label">${escapeHtml(translate(catalog, "levelLabel"))}</span><strong class="session-stat__value" data-role="session-level">${levelPercent}</strong></div>
        <div class="session-stat"><span class="session-stat__label">${escapeHtml(translate(catalog, "warningLabel"))}</span><strong class="session-stat__value session-stat__value--warning" data-role="session-warning" data-warning="${session.warning}">${escapeHtml(warningCopy(session.warning, catalog))}</strong></div>
        <div class="session-stat"><span class="session-stat__label">${escapeHtml(translate(catalog, "protectionActionLabel"))}</span><strong class="session-stat__value" data-role="session-protection-action">${escapeHtml(protectionAction)}</strong></div>
        <div class="session-stat"><span class="session-stat__label">${escapeHtml(translate(catalog, "clipEventsLabel"))}</span><strong class="session-stat__value" data-role="session-clip-events">${session.clipEvents}</strong></div>
      </div>
      <div class="session-card__meter">
        <div class="session-card__meter-meta">
          <span>${escapeHtml(translate(catalog, "levelLabel"))}</span>
          <span data-role="session-level-meter">${levelPercent}</span>
        </div>
        <div class="meter__bar meter__bar--session">
          <div class="meter__fill meter__fill--session" data-role="session-meter-fill" style="width:${meterWidth}%"></div>
        </div>
      </div>
      <div class="session-card__footer">
        <div class="session-card__footer-copy">
          <span class="session-card__status-dot" data-state="${visualStatus}"></span>
          <span class="session-card__footer-text">${escapeHtml(statusCopy(visualStatus, catalog))}</span>
        </div>
        <button class="ghost-button ghost-button--danger" data-stop-tab="${session.tabId}" type="button">
          ${escapeHtml(translate(catalog, "stopSession"))}
        </button>
      </div>
    </article>
  `;
}
