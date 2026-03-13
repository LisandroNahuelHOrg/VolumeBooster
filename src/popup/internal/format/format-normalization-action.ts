import { translate, type UiCatalog } from "../../../shared/runtime-i18n";
import type { NormalizationAction } from "../../../shared/types";

export function formatNormalizationAction(
  action: NormalizationAction,
  catalog: UiCatalog | null
): string {
  if (!catalog) {
    return action;
  }

  switch (action) {
    case "raising":
      return translate(catalog, "normalizationActionRaising");
    case "lowering":
      return translate(catalog, "normalizationActionLowering");
    case "capped":
      return translate(catalog, "normalizationActionCapped");
    default:
      return translate(catalog, "normalizationActionHolding");
  }
}
