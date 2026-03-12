import { closePopupSettings } from "../../popup-ui-state";
import { applyPopupRender } from "../runtime/apply-popup-render";
import type { PopupCommandContext } from "./popup-command-context";

export function closePopupSettingsView(context: PopupCommandContext): void {
  context.state.popupUiState = closePopupSettings(context.state.popupUiState);
  applyPopupRender(context.refs, context.state);
}
