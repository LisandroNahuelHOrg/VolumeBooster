import { MAX_GAIN_PERCENT, MIN_GAIN_PERCENT } from "../../../shared/constants";
import { roundTo } from "../util/round-to";

export function buildPresetToneStyle(value: number): string {
  const normalized = Math.log(value / MIN_GAIN_PERCENT) / Math.log(MAX_GAIN_PERCENT / MIN_GAIN_PERCENT);
  const hue = roundTo(42 - normalized * 34, 2);
  const saturation = roundTo(58 + normalized * 18, 2);
  const topLightness = roundTo(21 + normalized * 6, 2);
  const bottomLightness = roundTo(13 + normalized * 5, 2);
  const borderAlpha = roundTo(0.12 + normalized * 0.2, 3);
  const shadowAlpha = roundTo(0.1 + normalized * 0.14, 3);
  const glowAlpha = roundTo(0.1 + normalized * 0.2, 3);
  const highlightAlpha = roundTo(0.12 + normalized * 0.1, 3);
  const activeTopLightness = roundTo(topLightness + 5, 2);
  const activeBottomLightness = roundTo(bottomLightness + 4, 2);
  const activeBorderAlpha = roundTo(borderAlpha + 0.16, 3);
  const activeGlowAlpha = roundTo(glowAlpha + 0.12, 3);

  return [
    `--preset-bg-top: hsla(${hue}, ${saturation}%, ${topLightness}%, 0.42)`,
    `--preset-bg-bottom: hsla(${hue}, ${Math.min(92, saturation + 6)}%, ${bottomLightness}%, 0.22)`,
    `--preset-border: hsla(${hue}, ${Math.min(96, saturation + 8)}%, 66%, ${borderAlpha})`,
    `--preset-shadow: hsla(${Math.max(0, hue - 4)}, ${Math.min(100, saturation + 10)}%, 18%, ${shadowAlpha})`,
    `--preset-glow: hsla(${hue}, ${Math.min(100, saturation + 10)}%, 58%, ${glowAlpha})`,
    `--preset-highlight: hsla(${Math.max(10, hue - 3)}, ${Math.max(48, saturation - 6)}%, 84%, ${highlightAlpha})`,
    `--preset-text: hsla(${Math.max(18, hue - 6)}, 92%, ${roundTo(95 - normalized * 4, 2)}%, 0.98)`,
    `--preset-active-top: hsla(${hue}, ${Math.min(100, saturation + 18)}%, ${activeTopLightness + 1}%, 1)`,
    `--preset-active-bottom: hsla(${Math.max(4, hue - 2)}, ${Math.min(100, saturation + 22)}%, ${activeBottomLightness + 2}%, 0.69)`,
    `--preset-active-border: hsla(${Math.max(4, hue - 1)}, ${Math.min(100, saturation + 24)}%, 78%, ${roundTo(activeBorderAlpha * 1.5, 3)})`,
    `--preset-active-glow: hsla(${Math.max(0, hue - 3)}, ${Math.min(100, saturation + 18)}%, 56%, ${roundTo(activeGlowAlpha * 1.5, 3)})`
  ].join("; ");
}
