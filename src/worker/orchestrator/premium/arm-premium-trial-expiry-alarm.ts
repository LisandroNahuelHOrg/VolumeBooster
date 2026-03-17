import { PREMIUM_TRIAL_ALARM_NAME } from "../../../shared/premium-trial";
import type { WorkerRuntimeState } from "../runtime-state";

export async function armPremiumTrialExpiryAlarm(runtime: WorkerRuntimeState): Promise<void> {
  if (!runtime.premiumTrialRecord || !chrome.alarms?.clear || !chrome.alarms?.create) {
    return;
  }

  await chrome.alarms.clear(PREMIUM_TRIAL_ALARM_NAME);

  if (runtime.premiumEntitlement.source === "license") {
    return;
  }

  await chrome.alarms.create(PREMIUM_TRIAL_ALARM_NAME, {
    when: Date.parse(runtime.premiumTrialRecord.trialEndsAt)
  });
}
