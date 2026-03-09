/**
 * @fileoverview Runtime i18n helpers built on top of Chrome's native
 * `chrome.i18n` API.
 * @module shared/runtime-i18n
 */

import {
  I18N_KEYS,
  I18N_PLACEHOLDER_ORDER,
  I18N_PLURAL_BASES,
  type I18nKey,
  type I18nPluralBase,
  type I18nSubstitutionsFor
} from "../generated/i18n-types";
import { I18N_FALLBACK_MESSAGES } from "../generated/i18n-fallback";
import type { LocalizedMessage } from "./types";

const RTL_LOCALE_PREFIXES = ["ar", "fa", "he", "ps", "sd", "ug", "ur", "yi"] as const;
const I18N_KEY_SET = new Set<string>(I18N_KEYS);
const I18N_PLURAL_BASE_SET = new Set<string>(I18N_PLURAL_BASES);

export type UiMessageKey = I18nKey;
export type UiCatalog = Readonly<Record<string, string>>;

/** Narrow surface used by tests and runtime helpers instead of the global Chrome object. */
export interface ChromeI18nLike {
  getMessage(name: string, substitutions?: string | string[]): string;
  getUILanguage?(): string;
}

/** Returns the active Chrome i18n API when available. */
function getChromeI18n(): ChromeI18nLike | null {
  return typeof chrome !== "undefined" && chrome.i18n ? chrome.i18n : null;
}

/**
 * Resolves the UI language used by the extension.
 *
 * @param api - Optional injected Chrome i18n implementation.
 * @returns Current UI locale code.
 */
export function getUiLanguage(api: ChromeI18nLike | null = getChromeI18n()): string {
  return api?.getUILanguage?.() ?? globalThis.navigator?.language ?? "en";
}

/** Returns the browser locale used by the current runtime. */
export function getBrowserLocale(): string {
  return getUiLanguage();
}

/**
 * Detects whether a locale should be rendered right-to-left.
 *
 * @param locale - Locale code to inspect.
 * @returns `true` when the locale belongs to a known RTL family.
 */
export function isRtlLocale(locale: string): boolean {
  const normalized = locale.toLowerCase();
  return RTL_LOCALE_PREFIXES.some((prefix) => normalized === prefix || normalized.startsWith(`${prefix}-`));
}

/**
 * Applies `lang` and `dir` attributes to the current document root.
 *
 * @param doc - Target document.
 * @param locale - Locale to apply.
 * @returns Applied locale metadata.
 */
export function setDocumentLocaleAttributes(
  doc: Document = document,
  locale = getUiLanguage()
): { lang: string; dir: "ltr" | "rtl" } {
  const dir = isRtlLocale(locale) ? "rtl" : "ltr";
  doc.documentElement.lang = locale;
  doc.documentElement.dir = dir;
  return { lang: locale, dir };
}

/** Legacy compatibility shim. The project now resolves text directly from Chrome i18n. */
export async function loadLocaleCatalog(_locale?: string): Promise<UiCatalog> {
  return I18N_FALLBACK_MESSAGES;
}

/**
 * Resolves a translated message key using Chrome's native i18n API.
 *
 * @param key - Message key to resolve.
 * @param substitutions - Named substitutions matching the generated schema.
 * @param api - Optional injected i18n implementation.
 * @returns Localized string, or the key itself when i18n is unavailable.
 */
export function t<K extends I18nKey>(
  key: K,
  substitutions?: I18nSubstitutionsFor<K>,
  api: ChromeI18nLike | null = getChromeI18n()
): string {
  const chromeI18n = api ?? getChromeI18n();
  const orderedSubstitutions = toOrderedSubstitutions(key, substitutions);

  if (chromeI18n) {
    const message =
      orderedSubstitutions.length === 0
        ? chromeI18n.getMessage(key)
        : chromeI18n.getMessage(key, orderedSubstitutions);

    if (message) {
      return message;
    }
  }

  return getFallbackMessage(key, orderedSubstitutions) ?? key;
}

/**
 * Resolves a pluralized message family for the given count.
 *
 * @param baseKey - Base plural family key.
 * @param count - Count used to select the plural category.
 * @param substitutions - Optional placeholders for the final message.
 * @param api - Optional injected i18n implementation.
 * @param locale - Locale used for plural rules.
 * @returns Localized pluralized string or the numeric count as fallback.
 */
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

/** Backwards-compatible alias used by popup rendering helpers. */
export function translate<K extends I18nKey>(
  _catalog: UiCatalog,
  key: K,
  substitutions?: I18nSubstitutionsFor<K>
): string {
  return t(key, substitutions);
}

/**
 * Resolves the canonical English fallback message for a known i18n key.
 *
 * @param key - Message key to resolve.
 * @param substitutions - Optional ordered substitutions.
 * @returns English fallback string when the key exists in the canonical catalog.
 */
export function getFallbackMessage(key: string, substitutions?: readonly (string | number)[]): string | null {
  const template = I18N_FALLBACK_MESSAGES[key as keyof typeof I18N_FALLBACK_MESSAGES];

  if (typeof template !== "string" || template.length === 0) {
    return null;
  }

  const substitutionValues = substitutions?.map((value) => String(value)) ?? [];
  const orderedKeys = I18N_PLACEHOLDER_ORDER[key as I18nKey] ?? [];
  let resolved: string = template;

  orderedKeys.forEach((placeholderKey, index) => {
    const replacement = substitutionValues[index] ?? "";
    resolved = resolved.replaceAll(new RegExp(`\\$${escapeRegExp(placeholderKey)}\\$`, "gi"), replacement);
  });

  substitutionValues.forEach((replacement, index) => {
    resolved = resolved.replaceAll(`$${index + 1}`, replacement);
  });

  return resolved;
}

/**
 * Formats a localized message descriptor received over runtime messaging.
 *
 * @param messageValue - Structured localized message.
 * @returns Human-readable translated string.
 */
export function formatLocalizedMessage(messageValue?: LocalizedMessage | null): string {
  if (!messageValue) {
    return "";
  }

  return t(messageValue.key, messageValue.substitutions as I18nSubstitutionsFor<typeof messageValue.key>);
}

/** Checks whether a string is a known plural-message base key. */
export function isPluralBaseKey(value: string): value is I18nPluralBase {
  return I18N_PLURAL_BASE_SET.has(value);
}

/** Maps named placeholder substitutions into Chrome's ordered substitution array. */
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

/** Builds the ordered fallback list of pluralized message keys for a count. */
function getPluralCandidateKeys(baseKey: I18nPluralBase, count: number, locale: string): string[] {
  const category = new Intl.PluralRules(locale).select(count);
  const candidates =
    count === 0
      ? [`${baseKey}_zero`, `${baseKey}_${category}`, `${baseKey}_other`]
      : [`${baseKey}_${category}`, `${baseKey}_other`];

  return [...new Set(candidates)];
}

function escapeRegExp(value: string): string {
  return value.replaceAll(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
