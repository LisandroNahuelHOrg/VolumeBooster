import { captureExceptionSafe } from "../../../shared/observability/sentry";
import type { PopupTheme } from "../../../shared/types";
import type { PopupCommandContext } from "./popup-command-context";

export async function persistPopupThemeSafely(
  context: Pick<PopupCommandContext, "refs">,
  popupTheme: PopupTheme
): Promise<PopupTheme> {
  try {
    return await context.refs.settingsRepository.setPopupTheme(popupTheme);
  } catch (error) {
    captureExceptionSafe(error, "popup", {
      feature: "popup-theme-toggle",
      popupTheme
    });
    return popupTheme;
  }
}
