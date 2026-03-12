import { closeResourceQuietly } from "../shared/close-resource-quietly.mjs";
import { wait } from "../waiters/wait.mjs";

export async function findExtensionIdViaCdp(context) {
  const probePage = await context.newPage();

  try {
    const session = await context.newCDPSession(probePage);
    const deadline = Date.now() + 30000;

    while (Date.now() < deadline) {
      const { targetInfos } = await session.send("Target.getTargets");

      for (const targetInfo of targetInfos) {
        if (!targetInfo.url.startsWith("chrome-extension://")) {
          continue;
        }

        if (!["service_worker", "background_page", "page", "other"].includes(targetInfo.type)) {
          continue;
        }

        return new URL(targetInfo.url).host;
      }

      await wait(150);
    }

    return null;
  } finally {
    await closeResourceQuietly(probePage);
  }
}
