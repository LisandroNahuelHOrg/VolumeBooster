import { renderMainView } from "./render-main-view";
import { renderPremiumView } from "./render-premium-view";
import { renderPopupToolbar } from "./render-popup-toolbar";
import { renderSettingsView } from "./render-settings-view";
import type { PopupMainViewRenderModel, PopupRenderContext } from "./popup-render-types";
import type { PopupViewModel } from "../../../shared/types";

export function renderPopupMarkup(
  renderContext: PopupRenderContext,
  viewModel: PopupViewModel,
  mainViewModel: PopupMainViewRenderModel | null
): string {
  return `
    <div class="app-shell" data-popup-view="${renderContext.currentView}">
      ${renderPopupToolbar(renderContext)}
      ${renderContext.currentView === "settings"
        ? renderSettingsView(renderContext)
        : renderContext.currentView === "premium"
          ? renderPremiumView(renderContext, viewModel)
          : renderMainView(mainViewModel as PopupMainViewRenderModel)}
    </div>
  `;
}
