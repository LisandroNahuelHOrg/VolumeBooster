import type { AdvancedControlKey } from "../config/advanced-control-config";

export function formatAdvancedValue(key: AdvancedControlKey, value: number): string {
  switch (key) {
    case "ceilingDb":
      return `${value.toFixed(2)} dB`;
    case "lookaheadMs":
      return `${value.toFixed(1)} ms`;
    case "releaseMs":
      return `${Math.round(value)} ms`;
    case "multibandDepth":
      return `${Math.round(value)}%`;
    case "softClipMix":
      return `${value.toFixed(1)}%`;
  }
}
