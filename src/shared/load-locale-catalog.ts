/**
 * @fileoverview Returns the runtime fallback catalog used as a compatibility shim.
 * @module shared/load-locale-catalog
 */

import { I18N_FALLBACK_MESSAGES } from "../generated/i18n-fallback";
import type { UiCatalog } from "./runtime-i18n-types";

/** Legacy compatibility shim. The project now resolves text directly from Chrome i18n. */
export async function loadLocaleCatalog(_locale?: string): Promise<UiCatalog> {
  return I18N_FALLBACK_MESSAGES;
}
