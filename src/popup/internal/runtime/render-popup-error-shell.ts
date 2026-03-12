import { formatLocalizedMessage, translate, type UiCatalog } from "../../../shared/runtime-i18n";
import type { LocalizedMessage } from "../../../shared/types";
import { escapeHtml } from "../util/escape-html";

export function renderPopupErrorShell(
  catalog: UiCatalog,
  transientError: LocalizedMessage | null
): string {
  return `
    <div class="app-shell">
      <section class="hero">
        <div class="hero__eyebrow">
          <span class="chip">${escapeHtml(translate(catalog, "errorPrefix"))}</span>
        </div>
        <p class="hero__subtitle">${escapeHtml(formatLocalizedMessage(transientError) || translate(catalog, "tabUnavailable"))}</p>
      </section>
    </div>
  `;
}
