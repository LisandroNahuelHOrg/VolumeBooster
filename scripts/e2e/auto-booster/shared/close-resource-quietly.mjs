export async function closeResourceQuietly(resource) {
  if (!resource || typeof resource.close !== "function") {
    return;
  }

  try {
    await resource.close();
  } catch {
    // Intentionally swallow cleanup failures during E2E teardown.
  }
}
