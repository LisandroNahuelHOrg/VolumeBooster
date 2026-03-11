import { logStep } from "../logging/log-step.mjs";
import { sendCommandDetailed } from "./send-command-detailed.mjs";

export async function resetExtensionState(automationPage) {
  logStep("Resetting extension state.");
  await sendCommandDetailed(automationPage, { type: "STOP_ALL" });
  await sendCommandDetailed(automationPage, { type: "DISABLE_GLOBAL_AUTO_BOOSTER" });
}
