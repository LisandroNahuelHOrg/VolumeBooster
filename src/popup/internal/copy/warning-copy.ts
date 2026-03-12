import { translate, type UiCatalog } from "../../../shared/runtime-i18n";

export function warningCopy(warning: string, catalog: UiCatalog | null): string {
  if (!catalog) {
    return warning;
  }

  switch (warning) {
    case "high":
      return translate(catalog, "warningHigh");
    case "danger":
      return translate(catalog, "warningDanger");
    default:
      return translate(catalog, "warningNone");
  }
}
