/**
 * @fileoverview Checks whether the extension already has global host access.
 * @module automation/has-global-permission
 */

/**
 * Comprueba si la extensión ya dispone del permiso global de host para
 * auto-boosting en todos los sitios.
 */
export async function hasGlobalPermission(): Promise<boolean> {
  return chrome.permissions.contains({ origins: ["<all_urls>"] });
}
