import { DEFAULT_GAIN_PERCENT } from "../../../shared/constants";
import { aggregateAutoFrameStates } from "../../auto-tab-aggregate";
import { makeAutoFrameRuntimeState } from "./make-auto-frame-runtime-state";

it("uses DEFAULT_GAIN_PERCENT when the preferred frame gain is undefined", () => {
  const aggregation = aggregateAutoFrameStates(
    33,
    [makeAutoFrameRuntimeState({ autoAttachState: "attached", autoAttachReason: undefined, autoActiveStrategy: "media_element", streamState: "active", gainPercent: undefined })],
    () => 1
  );

  expect(aggregation?.tabState.gainPercent).toBe(DEFAULT_GAIN_PERCENT);
  expect(aggregation?.session?.gainPercent).toBe(DEFAULT_GAIN_PERCENT);
});
