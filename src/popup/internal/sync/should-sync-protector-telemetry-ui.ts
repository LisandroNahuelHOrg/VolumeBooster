import { PROTECTOR_TELEMETRY_UI_MS } from "../config/popup-runtime-config";
import type { PopupUiSyncRuntime } from "./popup-dynamic-ui-types";

export function shouldSyncProtectorTelemetryUi(
  displayKey: string,
  syncRuntime: PopupUiSyncRuntime,
  now = performance.now()
): boolean {
  if (
    displayKey !== syncRuntime.lastProtectorTelemetryDisplayKey ||
    now - syncRuntime.lastProtectorTelemetryUiAt >= PROTECTOR_TELEMETRY_UI_MS
  ) {
    syncRuntime.lastProtectorTelemetryDisplayKey = displayKey;
    syncRuntime.lastProtectorTelemetryUiAt = now;
    return true;
  }

  return false;
}
