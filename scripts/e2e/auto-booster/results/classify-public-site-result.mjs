export function classifyPublicSiteResult(initialDebug, finalDebug, playbackStarted) {
  if (finalDebug?.attachState === "attached") {
    return initialDebug?.attachState === "awaiting_user_gesture" ? "pass_after_user_gesture" : "pass_auto";
  }

  if (finalDebug?.attachState === "awaiting_user_gesture") {
    return playbackStarted ? "product_bug" : "pass_after_user_gesture";
  }

  if (finalDebug?.attachState === "unsupported") {
    return "site_not_hookable";
  }

  if (finalDebug?.attachState === "failed") {
    return "fallback_manual_required";
  }

  return "product_bug";
}
