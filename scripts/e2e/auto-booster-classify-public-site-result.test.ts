import { expect, test } from "vitest";
import { classifyPublicSiteResult } from "./auto-booster/results/classify-public-site-result.mjs";

test("classifies attached, awaiting gesture, unsupported and failed public-site outcomes", () => {
  expect(
    classifyPublicSiteResult({ attachState: "awaiting_user_gesture" }, { attachState: "attached" }, true)
  ).toBe("pass_after_user_gesture");
  expect(classifyPublicSiteResult(null, { attachState: "awaiting_user_gesture" }, false)).toBe("pass_after_user_gesture");
  expect(classifyPublicSiteResult(null, { attachState: "awaiting_user_gesture" }, true)).toBe("product_bug");
  expect(classifyPublicSiteResult(null, { attachState: "unsupported" }, false)).toBe("site_not_hookable");
  expect(classifyPublicSiteResult(null, { attachState: "failed" }, false)).toBe("fallback_manual_required");
});
