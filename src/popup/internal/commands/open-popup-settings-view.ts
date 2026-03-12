import { togglePopupSettingsView } from "../../toggle-popup-settings-view";
import { applyPopupRender } from "../runtime/apply-popup-render";
import type { PopupCommandContext } from "./popup-command-context";

export function openPopupSettingsView(context: PopupCommandContext): void {
  context.state.popupUiState = togglePopupSettingsView(context.state.popupUiState);
  applyPopupRender(context.refs, context.state);
}
