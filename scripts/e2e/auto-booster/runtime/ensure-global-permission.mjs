import { wait } from "../waiters/wait.mjs";
import { hasGlobalPermission } from "./has-global-permission.mjs";

export async function ensureGlobalPermission(automationPage) {
  if (await hasGlobalPermission(automationPage)) {
    return;
  }

  await automationPage.click("[data-action='request-global-permission']");
  const deadline = Date.now() + 10000;

  while (Date.now() < deadline) {
    if (await hasGlobalPermission(automationPage)) {
      return;
    }

    await wait(150);
  }

  throw new Error("Timed out while waiting for the global permission to be granted.");
}
