import { renderMainView } from "./render-main-view";
import { renderPopupToolbar } from "./render-popup-toolbar";
import { renderSettingsView } from "./render-settings-view";
import type { PopupMainViewRenderModel, PopupRenderContext } from "./popup-render-types";

export function renderPopupMarkup(
  renderContext: PopupRenderContext,
  mainViewModel: PopupMainViewRenderModel | null
): string {
  return `
    <div class="app-shell" data-popup-view="${renderContext.currentView}">
      ${renderPopupToolbar(renderContext)}
      ${renderContext.currentView === "settings" ? renderSettingsView(renderContext) : renderMainView(mainViewModel as PopupMainViewRenderModel)}
    </div>
  `;
}
