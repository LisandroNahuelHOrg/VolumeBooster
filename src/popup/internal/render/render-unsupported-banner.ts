import { translate } from "../../../shared/runtime-i18n";
import { escapeHtml } from "../util/escape-html";
import type { PopupMainViewRenderModel } from "./popup-render-types";

export function renderUnsupportedBanner(
  model: Pick<PopupMainViewRenderModel, "catalog" | "currentTab">
): string {
  if (model.currentTab?.supported) {
    return "";
  }

  return `
    <div class="error-banner">
      <strong>${escapeHtml(translate(model.catalog, "unsupportedTitle"))}</strong><br />
      ${escapeHtml(translate(model.catalog, "unsupportedDetail"))}
    </div>
  `;
}
