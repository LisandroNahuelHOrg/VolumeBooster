export async function waitForServiceWorker(context) {
  const existing = context.serviceWorkers()[0];

  if (existing) {
    return existing;
  }

  return context.waitForEvent("serviceworker", { timeout: 30000 });
}
