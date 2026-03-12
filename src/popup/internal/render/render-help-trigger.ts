import { translate, type UiCatalog } from "../../../shared/runtime-i18n";
import { escapeHtml } from "../util/escape-html";

export function renderHelpTrigger(
  helpLabelKey: string,
  helpTextKey: string,
  tooltipId: string,
  catalog: UiCatalog | null
): string {
  if (!catalog) {
    return "";
  }

  return `
    <span class="telemetry-pill__help-wrap">
      <button
        class="telemetry-pill__help"
        type="button"
        aria-label="${escapeHtml(translate(catalog, helpLabelKey as never))}"
        aria-describedby="floating-help-tooltip"
      >
        <span aria-hidden="true">?</span>
      </button>
      <span class="telemetry-pill__tooltip" role="tooltip" id="${tooltipId}" aria-hidden="true">
        ${escapeHtml(translate(catalog, helpTextKey as never))}
      </span>
    </span>
  `;
}
