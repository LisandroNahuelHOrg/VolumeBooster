export function getFocusedAdvancedControlKey(doc: Document): string | null {
  const activeElement = doc.activeElement;

  if (!(activeElement instanceof HTMLInputElement) || activeElement.dataset.role !== "advanced-slider") {
    return null;
  }

  return activeElement.dataset.advancedKey ?? null;
}
