import { resolvePremiumFeatureAccess } from "../../../shared/premium-license";
import { message, type PopupCommand } from "../../../shared/messages";
import type { LocalizedMessage } from "../../../shared/types";
import type { WorkerRuntimeState } from "../runtime-state";
import { resolveWorkerPremiumEntitlement } from "./resolve-worker-premium-entitlement";

export async function assertPopupCommandPremiumAccess(
  runtime: WorkerRuntimeState,
  command: PopupCommand
): Promise<LocalizedMessage | null> {
  const access = resolvePremiumFeatureAccess(
    await resolveWorkerPremiumEntitlement(runtime)
  );

  if (
    command.type === "SET_ADVANCED_AUDIO_SETTINGS" &&
    access.advancedSettingsLocked
  ) {
    return message("errorPremiumFeatureLocked");
  }

  if (
    (command.type === "ENABLE_GLOBAL_AUTO_BOOSTER" ||
      command.type === "REQUEST_GLOBAL_PERMISSION") &&
    access.globalAutoLocked
  ) {
    return message("errorPremiumFeatureLocked");
  }

  if (
    (command.type === "APPLY_SESSION_BOOST_TO_ALL_SITES" ||
      command.type === "RESET_SESSION_BOOST_ON_ALL_SITES") &&
    access.globalSessionBoostLocked
  ) {
    return message("errorPremiumFeatureLocked");
  }

  return null;
}
