import { expect, test } from "vitest";
import { evaluateScenarioResult } from "./auto-booster/results/evaluate-scenario-result.mjs";

test("evaluates attached, awaiting-then-attached and observing-no-media expectations", () => {
  expect(evaluateScenarioResult("attached", { attachState: "attached" })).toMatchObject({
    classification: "pass_auto",
    passed: true
  });
  expect(
    evaluateScenarioResult("awaiting_then_attached", { attachState: "attached" }, { attachState: "awaiting_user_gesture" })
  ).toMatchObject({
    classification: "pass_after_user_gesture",
    passed: true
  });
  expect(evaluateScenarioResult("observing_no_media", { attachReason: "no_media", attachState: "observing" })).toMatchObject({
    classification: "pass_auto",
    passed: true
  });
});
