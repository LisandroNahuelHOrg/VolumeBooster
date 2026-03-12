import { translate, type UiCatalog } from "../../../shared/runtime-i18n";
import type { PopupTheme } from "../../../shared/types";

export function getPopupThemeDisplayName(
  popupTheme: PopupTheme,
  catalog: UiCatalog | null
): string {
  if (!catalog) {
    return popupTheme;
  }

  return translate(
    catalog,
    popupTheme === "light" ? "popupThemeLightName" : "popupThemeDarkName"
  );
}
