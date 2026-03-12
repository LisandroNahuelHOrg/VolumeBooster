import { tp, type UiCatalog } from "../../../shared/runtime-i18n";

export function sessionSummaryCopy(count: number, catalog: UiCatalog | null): string {
  if (!catalog) {
    return String(count);
  }

  return tp("boostingCount", count, { count });
}
