import type { BoostSettingsBundle } from "../boost-settings-bundle";

export function areBoostSettingsBundlesEqual(
  left: BoostSettingsBundle | null | undefined,
  right: BoostSettingsBundle | null | undefined
): boolean {
  return JSON.stringify(left ?? null) === JSON.stringify(right ?? null);
}
