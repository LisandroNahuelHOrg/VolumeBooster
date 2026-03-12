import { translate, type UiCatalog } from "../../../shared/runtime-i18n";
import { escapeHtml } from "../util/escape-html";
import { renderHelpTrigger } from "./render-help-trigger";

export function renderTelemetryPillLabel(
  labelKey: string,
  helpLabelKey: string,
  helpTextKey: string,
  tooltipId: string,
  catalog: UiCatalog | null
): string {
  if (!catalog) {
    return "";
  }

  return `
    <div class="telemetry-pill__label-row">
      <span class="telemetry-pill__label-text">${escapeHtml(translate(catalog, labelKey as never))}</span>
      ${renderHelpTrigger(helpLabelKey, helpTextKey, tooltipId, catalog)}
    </div>
  `;
}
