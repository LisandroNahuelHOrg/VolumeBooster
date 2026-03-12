import { getBrowserLocale } from "../../../shared/runtime-i18n";

export function formatPresetValue(value: number, loadedLocale: string | null): string {
  return new Intl.NumberFormat(loadedLocale ?? getBrowserLocale()).format(value);
}
