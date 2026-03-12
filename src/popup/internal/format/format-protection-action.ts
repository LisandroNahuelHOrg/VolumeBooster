import { t, translate, type UiCatalog } from "../../../shared/runtime-i18n";

export function formatProtectionAction(
  value: number,
  protectionBypassed: boolean,
  catalog: UiCatalog | null
): string {
  if (protectionBypassed) {
    return catalog ? translate(catalog, "protectionActionBypassed") : t("protectionActionBypassed");
  }

  return `${Math.max(0, value).toFixed(1)} dB`;
}
