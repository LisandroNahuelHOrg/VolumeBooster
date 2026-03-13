import { PROTECTOR_TELEMETRY_UI_MS } from "../config/popup-runtime-config";
import type { PopupUiSyncRuntime } from "./popup-dynamic-ui-types";

export function shouldSyncVolumeNormalizationUi(
  displayKey: string,
  syncRuntime: PopupUiSyncRuntime,
  now = performance.now()
): boolean {
  if (
    displayKey !== syncRuntime.lastNormalizationTelemetryDisplayKey ||
    now - syncRuntime.lastNormalizationTelemetryUiAt >= PROTECTOR_TELEMETRY_UI_MS
  ) {
    syncRuntime.lastNormalizationTelemetryDisplayKey = displayKey;
    syncRuntime.lastNormalizationTelemetryUiAt = now;
    return true;
  }

  return false;
}
