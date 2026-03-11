import { DROPPED_FIELD_NAMES, REDACTED_VALUE, SENSITIVE_FIELD_NAMES, URL_FIELD_NAMES } from "../constants";
import { isPlainObject } from "./is-plain-object";
import { stripQueryAndHash } from "./strip-query-and-hash";

export function sanitizeStructuredData(value: unknown, key?: string): unknown {
  if (value === null || value === undefined) {
    return value;
  }

  const normalizedKey = key?.toLowerCase();

  if (normalizedKey && DROPPED_FIELD_NAMES.has(normalizedKey)) {
    return undefined;
  }

  if (normalizedKey && SENSITIVE_FIELD_NAMES.has(normalizedKey)) {
    return REDACTED_VALUE;
  }

  if (typeof value === "string") {
    if (normalizedKey && URL_FIELD_NAMES.has(normalizedKey)) {
      return stripQueryAndHash(value);
    }

    return value;
  }

  if (Array.isArray(value)) {
    const nextArray: unknown[] = [];

    for (const entry of value) {
      const sanitizedEntry = sanitizeStructuredData(entry);

      if (sanitizedEntry !== undefined) {
        nextArray.push(sanitizedEntry);
      }
    }

    return nextArray;
  }

  if (isPlainObject(value)) {
    const nextRecord: Record<string, unknown> = {};

    for (const [entryKey, entryValue] of Object.entries(value)) {
      const sanitizedValue = sanitizeStructuredData(entryValue, entryKey);

      if (sanitizedValue !== undefined) {
        nextRecord[entryKey] = sanitizedValue;
      }
    }

    return nextRecord;
  }

  return value;
}
