import { t, translate, type UiCatalog } from "../../../shared/runtime-i18n";

export function formatClipPeak(value: number, catalog: UiCatalog | null): string {
  if (value <= 1) {
    return catalog ? translate(catalog, "clipPeakNone") : t("clipPeakNone");
  }

  return `${Math.round(value * 100)}%`;
}
