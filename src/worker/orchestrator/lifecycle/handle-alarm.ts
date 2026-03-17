import { PREMIUM_TRIAL_ALARM_NAME } from "../../../shared/premium-trial";
import type { WorkerRuntimeState } from "../runtime-state";
import { syncPremiumEntitlementRuntime } from "../premium/sync-premium-entitlement-runtime";

export async function handleAlarm(
  runtime: WorkerRuntimeState,
  alarm: chrome.alarms.Alarm
): Promise<void> {
  if (alarm.name !== PREMIUM_TRIAL_ALARM_NAME) {
    return;
  }

  await syncPremiumEntitlementRuntime(runtime);
}
