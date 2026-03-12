import { enqueuePopupThemePersistence, togglePopupThemeLocally } from "../../popup-ui-state";
import type { PopupCommandContext } from "./popup-command-context";
import { persistPopupThemeSafely } from "./persist-popup-theme-safely";
import { setPopupThemeUi } from "./set-popup-theme-ui";

export function handlePopupThemeToggle(context: PopupCommandContext): void {
  const nextState = togglePopupThemeLocally(context.state.popupUiState);
  setPopupThemeUi(context, nextState.popupTheme);
  context.state.popupThemePersistQueue = enqueuePopupThemePersistence(
    context.state.popupThemePersistQueue,
    {
      setPopupTheme: persistPopupThemeSafely.bind(null, context)
    },
    nextState.popupTheme
  );
}
