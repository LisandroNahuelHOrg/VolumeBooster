/**
 * @fileoverview Shared runtime i18n public types.
 * @module shared/runtime-i18n-types
 */

import type { I18nKey } from "../generated/i18n-types";

export type UiMessageKey = I18nKey;
export type UiCatalog = Readonly<Record<string, string>>;

/** Narrow surface used by tests and runtime helpers instead of the global Chrome object. */
export interface ChromeI18nLike {
  getMessage(name: string, substitutions?: string | string[]): string;
  getUILanguage?(): string;
}
