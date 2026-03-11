export function evaluateScenarioResult(expected, finalDebug, initialDebug = null) {
  if (expected === "attached") {
    return {
      classification: finalDebug?.attachState === "attached" ? "pass_auto" : "product_bug",
      finalDebug,
      passed: finalDebug?.attachState === "attached"
    };
  }

  if (expected === "awaiting_then_attached") {
    const passed = initialDebug?.attachState === "awaiting_user_gesture" && finalDebug?.attachState === "attached";
    return {
      classification: passed ? "pass_after_user_gesture" : "product_bug",
      finalDebug,
      passed
    };
  }

  if (expected === "observing_no_media") {
    const passed = finalDebug?.attachState === "observing" && finalDebug?.attachReason === "no_media";
    return {
      classification: passed ? "pass_auto" : "product_bug",
      finalDebug,
      passed
    };
  }

  return {
    classification: "product_bug",
    finalDebug,
    passed: false
  };
}
