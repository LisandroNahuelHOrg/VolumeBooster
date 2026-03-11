export async function getMemoryStorageItems(
  store: Record<string, unknown>,
  key?: string | string[] | null
): Promise<Record<string, unknown>> {
  if (!key) {
    return { ...store };
  }

  if (typeof key === "string") {
    return { [key]: store[key] };
  }

  const selectedItems: Record<string, unknown> = {};

  for (const currentKey of key) {
    selectedItems[currentKey] = store[currentKey];
  }

  return selectedItems;
}
