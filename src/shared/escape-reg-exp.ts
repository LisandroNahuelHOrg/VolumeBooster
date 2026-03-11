/**
 * @fileoverview Escapes arbitrary strings for regular-expression usage.
 * @module shared/escape-reg-exp
 */

export function escapeRegExp(value: string): string {
  return value.replaceAll(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
