import {
  ADVANCED_CONTROL_CONFIG,
  type AdvancedControlKey
} from "../config/advanced-control-config";

export function getAdvancedSliderProgressPercent(
  key: AdvancedControlKey,
  value: number
): number {
  const config = ADVANCED_CONTROL_CONFIG[key];
  return ((value - config.min) / (config.max - config.min)) * 100;
}
