import { translate } from "../../../shared/runtime-i18n";
import { escapeHtml } from "../util/escape-html";
import { getPopupThemeDisplayName } from "../copy/get-popup-theme-display-name";
import type { PopupRenderContext } from "./popup-render-types";

export function renderSettingsView(renderContext: PopupRenderContext): string {
  if (!renderContext.catalog) {
    return "";
  }

  const themeName = getPopupThemeDisplayName(renderContext.popupTheme, renderContext.catalog);

  return `
    <section class="panel panel--stack popup-settings-view">
      <header class="popup-settings-view__header">
        <button class="ghost-button ghost-button--soft popup-settings-view__back" data-action="close-popup-settings" type="button">
          ${escapeHtml(translate(renderContext.catalog, "popupSettingsBackLabel"))}
        </button>
        <div class="popup-settings-view__copy">
          <p class="panel__title">${escapeHtml(translate(renderContext.catalog, "popupSettingsEyebrow"))}</p>
          <h2 class="popup-settings-view__title">${escapeHtml(translate(renderContext.catalog, "popupSettingsTitle"))}</h2>
          <p class="muted-copy">${escapeHtml(translate(renderContext.catalog, "popupSettingsSubtitle"))}</p>
        </div>
      </header>
      <div class="popup-settings-view__grid">
        <article class="popup-settings-card popup-settings-card--appearance">
          <div class="popup-settings-card__copy">
            <p class="panel__title">${escapeHtml(translate(renderContext.catalog, "popupSettingsAppearanceTitle"))}</p>
            <strong class="popup-settings-card__title" data-role="popup-theme-name">${escapeHtml(themeName)}</strong>
            <p class="muted-copy">${escapeHtml(translate(renderContext.catalog, "popupSettingsAppearanceDetail"))}</p>
          </div>
          <dl class="popup-settings-card__facts"><div><dt>${escapeHtml(translate(renderContext.catalog, "popupSettingsCurrentThemeLabel"))}</dt><dd data-role="popup-theme-name">${escapeHtml(themeName)}</dd></div></dl>
        </article>
        <article class="popup-settings-card">
          <div class="popup-settings-card__copy">
            <p class="panel__title">${escapeHtml(translate(renderContext.catalog, "popupSettingsRoadmapTitle"))}</p>
            <strong class="popup-settings-card__title">${escapeHtml(translate(renderContext.catalog, "popupSettingsRoadmapHeading"))}</strong>
            <p class="muted-copy">${escapeHtml(translate(renderContext.catalog, "popupSettingsRoadmapDetail"))}</p>
          </div>
        </article>
      </div>
    </section>
  `;
}
