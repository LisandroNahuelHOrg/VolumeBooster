export async function setMemoryStorageItems(
  store: Record<string, unknown>,
  items: Record<string, unknown>
): Promise<void> {
  Object.assign(store, items);
}
