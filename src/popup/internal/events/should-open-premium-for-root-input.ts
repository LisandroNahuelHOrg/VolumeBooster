export function shouldOpenPremiumForRootInput(
  premiumUnlocked: boolean,
  target: HTMLInputElement | HTMLTextAreaElement
): boolean {
  return (
    !premiumUnlocked &&
    (target.dataset.role === "normalization-slider" || target.dataset.role === "advanced-slider")
  );
}
