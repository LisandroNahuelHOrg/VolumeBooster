import { readdirSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

const repoRoot = resolve(import.meta.dirname, "..");
const localesRoot = resolve(repoRoot, "public/_locales");
const pluralSuffixes = ["zero", "one", "two", "few", "many", "other"];
const issues = [];

const localeDirs = readdirSync(localesRoot, { withFileTypes: true })
  .filter((entry) => entry.isDirectory())
  .map((entry) => entry.name)
  .sort();

if (!localeDirs.includes("en")) {
  issues.push('Missing canonical locale "en".');
}

const englishCatalog = readLocale("en");
const englishKeys = Object.keys(englishCatalog).sort();
const pluralBases = collectPluralBases(englishKeys);

validateCatalogEntries("en", englishCatalog, true);

for (const locale of localeDirs) {
  const catalog = readLocale(locale);
  validateCatalogEntries(locale, catalog, locale === "en");
  validateExactKeys(locale, englishKeys, Object.keys(catalog).sort());
  validatePlaceholders(locale, englishCatalog, catalog);
  validatePluralFamilies(locale, catalog, pluralBases);
}

if (issues.length > 0) {
  console.error("i18n check failed:");
  for (const issue of issues) {
    console.error(`- ${issue}`);
  }
  process.exit(1);
}

console.log(`i18n check passed for locales: ${localeDirs.join(", ")}`);

function readLocale(locale) {
  const localePath = resolve(localesRoot, locale, "messages.json");
  return JSON.parse(readFileSync(localePath, "utf8"));
}

function validateCatalogEntries(locale, catalog, requireDescription) {
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
    }
  }
}

function validateExactKeys(locale, expectedKeys, actualKeys) {
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

function validatePlaceholders(locale, canonicalCatalog, catalog) {
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

function validatePluralFamilies(locale, catalog, bases) {
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
        issues.push(`[${locale}] Missing plural key ${key}.`);
      }
    }
  }
}

function collectPluralBases(keys) {
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
