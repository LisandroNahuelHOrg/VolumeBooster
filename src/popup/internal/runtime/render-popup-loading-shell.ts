import { t } from "../../../shared/runtime-i18n";
import { escapeHtml } from "../util/escape-html";

export function renderPopupLoadingShell(): string {
  return `<div class="app-shell"><section class="hero"><p class="hero__subtitle">${escapeHtml(t("loadingLabel"))}</p></section></div>`;
}
