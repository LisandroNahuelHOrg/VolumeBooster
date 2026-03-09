import { existsSync, readdirSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { DEFAULT_I18N_CONFIG, loadI18nConfig } from "./i18n-config-lib.mjs";

export const GENERIC_ENGLISH_DESCRIPTION_PATTERNS = [
  /^Localized UI copy for\b/i,
  /^Label text for\b/i,
  /^Heading text for\b/i,
  /^Status label used by\b/i,
  /^Preset label used by\b/i,
  /^Preset subtitle used by\b/i,
  /^Audio Quality Protector copy for\b/i,
  /^User-visible error message for\b/i
];

export function runI18nCheck(repoRoot) {
  const config = loadI18nConfig(repoRoot);
  const localeDirectories = config.localeDirectories ?? DEFAULT_I18N_CONFIG.localeDirectories;
  const issues = [];
  const localeDirSet = new Set();
  const identicalAllowlist = readIdenticalAllowlist(repoRoot);

  for (const localeDirectory of localeDirectories) {
    const localesRoot = resolve(repoRoot, localeDirectory);
    const scopePrefix = localeDirectories.length > 1 ? `${localeDirectory}:` : "";

    if (!existsSync(localesRoot)) {
      issues.push(`[config] Missing locale directory ${localeDirectory}.`);
      continue;
    }

    const localeDirs = collectLocaleDirectories(localesRoot);
    localeDirs.forEach((locale) => localeDirSet.add(locale));

    if (!localeDirs.includes("en")) {
      issues.push(`[${scopePrefix}en] Missing canonical locale "en".`);
      continue;
    }

    const englishCatalog = readLocale(localesRoot, "en");
    const englishKeys = Object.keys(englishCatalog).sort();
    const pluralBases = collectPluralBases(englishKeys);
    validateCatalogEntries(`${scopePrefix}en`, englishCatalog, issues, true);

    for (const locale of localeDirs) {
      const scopedLocale = `${scopePrefix}${locale}`;
      const catalog = readLocale(localesRoot, locale);
      validateCatalogEntries(scopedLocale, catalog, issues, locale === "en");
      validateExactKeys(scopedLocale, englishKeys, Object.keys(catalog).sort(), issues);
      validatePlaceholders(scopedLocale, englishCatalog, catalog, issues);
      validatePluralFamilies(scopedLocale, locale, catalog, pluralBases, issues);
      validateIdenticalMessages(scopedLocale, locale, englishCatalog, catalog, identicalAllowlist, issues);
    }
  }

  return { issues, localeDirs: [...localeDirSet].sort() };
}

export function isGenericEnglishDescription(description) {
  if (typeof description !== "string" || description.trim().length === 0) {
    return true;
  }

  return GENERIC_ENGLISH_DESCRIPTION_PATTERNS.some((pattern) => pattern.test(description.trim()));
}

export function readIdenticalAllowlist(repoRoot) {
  const allowlistPath = resolve(repoRoot, "scripts/i18n-identical-allowlist.json");

  if (!existsSync(allowlistPath)) {
    return new Set();
  }

  const parsed = JSON.parse(readFileSync(allowlistPath, "utf8"));
  const keys = Array.isArray(parsed?.identicalMessageKeys) ? parsed.identicalMessageKeys : [];
  return new Set(keys);
}

export function collectLocaleDirectories(localesRoot) {
  return readdirSync(localesRoot, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .sort();
}

function readLocale(localesRoot, locale) {
  const localePath = resolve(localesRoot, locale, "messages.json");
  return JSON.parse(readFileSync(localePath, "utf8"));
}

function validateCatalogEntries(locale, catalog, issues, requireDescription) {
  for (const [key, entry] of Object.entries(catalog)) {
    if (!entry || typeof entry !== "object") {
      issues.push(`[${locale}] ${key} must be an object.`);
      continue;
    }

    if (typeof entry.message !== "string" || entry.message.trim().length === 0) {
      issues.push(`[${locale}] ${key} must have a non-empty message.`);
    }

    if (requireDescription && (typeof entry.description !== "string" || entry.description.trim().length === 0)) {
      issues.push(`[${locale}] ${key} must have a non-empty description in en.`);
      continue;
    }

    if (requireDescription && isGenericEnglishDescription(entry.description)) {
      issues.push(`[${locale}] ${key} must have a contextual description in en.`);
    }
  }
}

function validateExactKeys(locale, expectedKeys, actualKeys, issues) {
  const expected = new Set(expectedKeys);
  const actual = new Set(actualKeys);

  for (const key of expected) {
    if (!actual.has(key)) {
      issues.push(`[${locale}] Missing key ${key}.`);
    }
  }

  for (const key of actual) {
    if (!expected.has(key)) {
      issues.push(`[${locale}] Unexpected extra key ${key}.`);
    }
  }
}

function validatePlaceholders(locale, canonicalCatalog, catalog, issues) {
  for (const key of Object.keys(canonicalCatalog)) {
    const canonicalSpec = getPlaceholderSpec(canonicalCatalog[key]?.placeholders);
    const localeSpec = getPlaceholderSpec(catalog[key]?.placeholders);

    if (canonicalSpec.length !== localeSpec.length) {
      issues.push(
        `[${locale}] ${key} placeholder count mismatch. Expected ${canonicalSpec.length}, found ${localeSpec.length}.`
      );
      continue;
    }

    for (let index = 0; index < canonicalSpec.length; index += 1) {
      if (canonicalSpec[index] !== localeSpec[index]) {
        issues.push(
          `[${locale}] ${key} placeholder mismatch at position ${index + 1}. Expected ${canonicalSpec[index]}, found ${localeSpec[index]}.`
        );
      }
    }
  }
}

function validatePluralFamilies(localeLabel, locale, catalog, bases, issues) {
  const normalizedLocale = locale.replace(/_/g, "-");
  const categories = new Set([
    "other",
    "zero",
    ...new Intl.PluralRules(normalizedLocale).resolvedOptions().pluralCategories
  ]);

  for (const base of bases) {
    for (const category of categories) {
        const key = `${base}_${category}`;
        if (!(key in catalog)) {
        issues.push(`[${localeLabel}] Missing plural key ${key}.`);
      }
    }
  }
}

function validateIdenticalMessages(localeLabel, locale, englishCatalog, catalog, identicalAllowlist, issues) {
  if (locale === "en") {
    return;
  }

  for (const [key, englishEntry] of Object.entries(englishCatalog)) {
    if (identicalAllowlist.has(key)) {
      continue;
    }

    const localizedEntry = catalog[key];
    if (!localizedEntry || typeof localizedEntry.message !== "string") {
      continue;
    }

    if (normalizeMessage(localizedEntry.message) === normalizeMessage(englishEntry.message)) {
      issues.push(`[${localeLabel}] ${key} still matches the canonical English message and is not allowlisted.`);
    }
  }
}

function collectPluralBases(keys) {
  const pluralSuffixes = ["zero", "one", "two", "few", "many", "other"];
  const result = new Set();

  for (const key of keys) {
    const match = key.match(new RegExp(`^(.*)_(${pluralSuffixes.join("|")})$`));

    if (match) {
      result.add(match[1]);
    }
  }

  return [...result].sort();
}

function getPlaceholderSpec(placeholders) {
  if (!placeholders || typeof placeholders !== "object") {
    return [];
  }

  return Object.entries(placeholders)
    .map(([name, value]) => `${name}:${getPlaceholderPosition(value?.content)}`)
    .sort((left, right) => left.localeCompare(right));
}

function getPlaceholderPosition(content) {
  const match = String(content ?? "").match(/\$(\d+)/);
  return match ? Number(match[1]) : Number.MAX_SAFE_INTEGER;
}

function normalizeMessage(value) {
  return String(value).replace(/\s+/g, " ").trim();
}
