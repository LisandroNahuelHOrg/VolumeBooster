export function syncBoostingBackground(doc: Document, isBoosting: boolean): void {
  doc.body.dataset.boosting = String(isBoosting);
}
