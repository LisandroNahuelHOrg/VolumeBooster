/**
 * @fileoverview Shared popup copy helpers for the two boost-mode CTA buttons.
 * @module popup/lane-button-copy
 */

import { translate, t, type UiCatalog } from "../shared/runtime-i18n";

export type LaneButtonCopyKind = "current-tab" | "all-sites";

interface LaneButtonCopyResult {
  action: string;
  mode: string;
}

const LANE_BUTTON_MODE_KEYS: Record<LaneButtonCopyKind, "laneMode1Label" | "laneMode2Label"> = {
  "current-tab": "laneMode1Label",
  "all-sites": "laneMode2Label"
};

export function getLaneButtonCopy(
  kind: LaneButtonCopyKind,
  active: boolean,
  catalog: UiCatalog | null
): LaneButtonCopyResult {
  const actionKey = active ? "laneActionDeactivate" : "laneActionActivate";
  const modeKey = LANE_BUTTON_MODE_KEYS[kind];

  if (!catalog) {
    return {
      action: t(actionKey),
      mode: t(modeKey)
    };
  }

  return {
    action: translate(catalog, actionKey),
    mode: translate(catalog, modeKey)
  };
}
