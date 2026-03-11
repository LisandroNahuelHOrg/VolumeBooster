/**
 * @fileoverview Serializes popup theme persistence writes.
 * @module popup/enqueue-popup-theme-persistence
 */

import type { PopupTheme } from "../shared/types";
import type { PopupThemePersistence } from "./popup-ui-state-types";

/**
 * Serializes popup theme writes so rapid clicks cannot persist out of order.
 *
 * @param persistQueue - Previous popup theme persistence queue.
 * @param persistence - Repository-like persistence target.
 * @param popupTheme - Theme to persist once previous writes complete.
 * @returns Updated queue promise including the new write.
 */
export function enqueuePopupThemePersistence(
  persistQueue: Promise<void>,
  persistence: PopupThemePersistence,
  popupTheme: PopupTheme
): Promise<void> {
  return persistQueue.catch(() => undefined).then(async () => {
    await persistence.setPopupTheme(popupTheme);
  });
}
