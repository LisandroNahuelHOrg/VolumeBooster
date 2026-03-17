import { togglePopupPremiumView } from "../../toggle-popup-premium-view";
import { applyPopupRender } from "../runtime/apply-popup-render";
import type { PopupCommandContext } from "./popup-command-context";

export function openPopupPremiumView(context: PopupCommandContext): void {
  context.state.popupUiState = togglePopupPremiumView(context.state.popupUiState);
  applyPopupRender(context.refs, context.state);
}
