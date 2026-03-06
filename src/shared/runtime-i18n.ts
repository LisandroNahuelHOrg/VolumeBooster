import {
  I18N_KEYS,
  I18N_PLACEHOLDER_ORDER,
  I18N_PLURAL_BASES,
  type I18nKey,
  type I18nPluralBase,
  type I18nSubstitutionsFor
} from "../generated/i18n-types";
import type { LocalizedMessage } from "./types";

const RTL_LOCALE_PREFIXES = ["ar", "fa", "he", "ps", "sd", "ug", "ur", "yi"] as const;
const I18N_KEY_SET = new Set<string>(I18N_KEYS);
const I18N_PLURAL_BASE_SET = new Set<string>(I18N_PLURAL_BASES);

export type UiMessageKey = I18nKey;
export type UiCatalog = Record<string, never>;

export interface ChromeI18nLike {
  getMessage(name: string, substitutions?: string | string[]): string;
  getUILanguage?(): string;
}

function getChromeI18n(): ChromeI18nLike | null {
  return typeof chrome !== "undefined" && chrome.i18n ? chrome.i18n : null;
}

export function getUiLanguage(api: ChromeI18nLike | null = getChromeI18n()): string {
  return api?.getUILanguage?.() ?? globalThis.navigator?.language ?? "en";
}

export function getBrowserLocale(): string {
  return getUiLanguage();
}

export function isRtlLocale(locale: string): boolean {
  const normalized = locale.toLowerCase();
  return RTL_LOCALE_PREFIXES.some((prefix) => normalized === prefix || normalized.startsWith(`${prefix}-`));
}

export function setDocumentLocaleAttributes(
  doc: Document = document,
  locale = getUiLanguage()
): { lang: string; dir: "ltr" | "rtl" } {
  const dir = isRtlLocale(locale) ? "rtl" : "ltr";
  doc.documentElement.lang = locale;
  doc.documentElement.dir = dir;
  return { lang: locale, dir };
}

export async function loadLocaleCatalog(_locale?: string): Promise<UiCatalog> {
  return {};
}

export function t<K extends I18nKey>(
  key: K,
  substitutions?: I18nSubstitutionsFor<K>,
  api: ChromeI18nLike | null = getChromeI18n()
): string {
  const chromeI18n = api ?? getChromeI18n();

  if (!chromeI18n) {
    return key;
  }

  const orderedSubstitutions = toOrderedSubstitutions(key, substitutions);
  const message =
    orderedSubstitutions.length === 0
      ? chromeI18n.getMessage(key)
      : chromeI18n.getMessage(key, orderedSubstitutions);

  return message || key;
}

export function tp<B extends I18nPluralBase>(
  baseKey: B,
  count: number,
  substitutions?: I18nSubstitutionsFor<Extract<I18nKey, `${B}_${"other"}`>>,
  api: ChromeI18nLike | null = getChromeI18n(),
  locale = getUiLanguage(api)
): string {
  const candidateKeys = getPluralCandidateKeys(baseKey, count, locale);

  for (const candidateKey of candidateKeys) {
    if (I18N_KEY_SET.has(candidateKey)) {
      return t(
        candidateKey as Extract<I18nKey, `${B}_${"zero" | "one" | "two" | "few" | "many" | "other"}`>,
        substitutions as I18nSubstitutionsFor<Extract<I18nKey, `${B}_${"zero" | "one" | "two" | "few" | "many" | "other"}`>>,
        api
      );
    }
  }

  return String(count);
}

export function translate<K extends I18nKey>(
  _catalog: UiCatalog,
  key: K,
  substitutions?: I18nSubstitutionsFor<K>
): string {
  return t(key, substitutions);
}

export function formatLocalizedMessage(messageValue?: LocalizedMessage | null): string {
  if (!messageValue) {
    return "";
  }

  return t(messageValue.key, messageValue.substitutions as I18nSubstitutionsFor<typeof messageValue.key>);
}

export function isPluralBaseKey(value: string): value is I18nPluralBase {
  return I18N_PLURAL_BASE_SET.has(value);
}

function toOrderedSubstitutions<K extends I18nKey>(
  key: K,
  substitutions?: I18nSubstitutionsFor<K>
): string[] {
  if (!substitutions) {
    return [];
  }

  const orderedKeys = I18N_PLACEHOLDER_ORDER[key] ?? [];
  const substitutionMap = substitutions as Record<string, string | number>;

  return orderedKeys.map((placeholderKey) => String(substitutionMap[placeholderKey] ?? ""));
}

function getPluralCandidateKeys(baseKey: I18nPluralBase, count: number, locale: string): string[] {
  const category = new Intl.PluralRules(locale).select(count);
  const candidates =
    count === 0
      ? [`${baseKey}_zero`, `${baseKey}_${category}`, `${baseKey}_other`]
      : [`${baseKey}_${category}`, `${baseKey}_other`];

  return [...new Set(candidates)];
}
