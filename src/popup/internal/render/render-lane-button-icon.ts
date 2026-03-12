import type { LaneButtonCopyKind } from "../../lane-button-copy";
import { LANE_BUTTON_ICON_MARKUP } from "./lane-button-icon-markup";

export function renderLaneButtonIcon(kind: LaneButtonCopyKind): string {
  return `
    <span class="ghost-button--lane__icon-badge" aria-hidden="true">
      <span class="ghost-button--lane__icon">
        ${LANE_BUTTON_ICON_MARKUP[kind]}
      </span>
    </span>
  `;
}
