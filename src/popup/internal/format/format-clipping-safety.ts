import { deriveClippingSafetyMarginDb } from "../../../shared/audio-settings";
import { t, translate, type UiCatalog } from "../../../shared/runtime-i18n";

export function formatClippingSafety(outputPeak: number, catalog: UiCatalog | null): string {
  const marginDb = deriveClippingSafetyMarginDb(outputPeak);

  if (marginDb === null) {
    return catalog ? translate(catalog, "clippingSafetyIdle") : t("clippingSafetyIdle");
  }

  if (marginDb >= 9.9) {
    return catalog ? translate(catalog, "clippingSafetyMax") : t("clippingSafetyMax");
  }

  return `${marginDb.toFixed(1)} dB`;
}
