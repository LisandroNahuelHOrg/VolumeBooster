const premiumActionNames = new Set([
  "apply-session-boost-to-all-sites",
  "reset-session-boost-on-all-sites"
]);

export function shouldOpenPremiumForRootClick(args: {
  premiumUnlocked: boolean;
  advancedPresetButton: HTMLButtonElement | null;
  qualityProtectorButton: HTMLButtonElement | null;
  volumeNormalizationButton: HTMLButtonElement | null;
  actionButton: HTMLButtonElement | null;
}): boolean {
  return (
    !args.premiumUnlocked &&
    Boolean(
      args.advancedPresetButton ||
        args.qualityProtectorButton ||
        args.volumeNormalizationButton ||
        (args.actionButton?.dataset.action &&
          premiumActionNames.has(args.actionButton.dataset.action))
    )
  );
}
