import { t, translate, type UiCatalog } from "../../../shared/runtime-i18n";

export function statusCopy(state: string, catalog: UiCatalog | null): string {
  if (!catalog) {
    return state;
  }

  switch (state) {
    case "pending":
      return translate(catalog, "statusPending");
    case "active":
      return translate(catalog, "statusActive");
    case "error":
      return translate(catalog, "statusError");
    case "unsupported":
      return translate(catalog, "statusUnsupported");
    default:
      return t("statusIdle");
  }
}
