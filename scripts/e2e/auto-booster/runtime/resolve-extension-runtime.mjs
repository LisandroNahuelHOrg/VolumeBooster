import { findExtensionIdViaCdp } from "./find-extension-id-via-cdp.mjs";
import { waitForServiceWorker } from "./wait-for-service-worker.mjs";

export async function resolveExtensionRuntime(context) {
  try {
    const serviceWorker = await waitForServiceWorker(context);
    return {
      extensionId: new URL(serviceWorker.url()).host,
      serviceWorker
    };
  } catch {
    const extensionId = await findExtensionIdViaCdp(context);

    if (!extensionId) {
      throw new Error("Could not resolve extension runtime through service worker or CDP targets.");
    }

    return {
      extensionId,
      serviceWorker: null
    };
  }
}
