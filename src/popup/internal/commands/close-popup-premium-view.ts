import { closePopupPremium } from "../../close-popup-premium";
import { applyPopupRender } from "../runtime/apply-popup-render";
import type { PopupCommandContext } from "./popup-command-context";

export function closePopupPremiumView(context: PopupCommandContext): void {
  context.state.popupUiState = closePopupPremium(context.state.popupUiState);
  applyPopupRender(context.refs, context.state);
}
