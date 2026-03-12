import { setTimeout as waitForTimeout } from "node:timers/promises";

export async function wait(milliseconds) {
  await waitForTimeout(milliseconds);
}
