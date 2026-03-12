import { translate, type UiCatalog } from "../../../shared/runtime-i18n";
import { escapeHtml } from "../util/escape-html";

export function renderSessionPlaceholderCard(
  placeholderIndex: number,
  catalog: UiCatalog | null
): string {
  if (!catalog) {
    return "";
  }

  return `
    <article class="session-card session-card--placeholder" data-session-placeholder="${placeholderIndex}" aria-hidden="true">
      <div class="session-card__placeholder-orb"></div>
      <div class="session-card__placeholder-copy">
        <span class="session-card__placeholder-label">${escapeHtml(
          translate(catalog, "sessionPlaceholderTitle")
        )}</span>
        <p>${escapeHtml(translate(catalog, "sessionPlaceholderDetail"))}</p>
      </div>
    </article>
  `;
}
