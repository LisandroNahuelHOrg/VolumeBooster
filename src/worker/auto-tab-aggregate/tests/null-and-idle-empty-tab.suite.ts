import { aggregateAutoFrameStates } from "../../auto-tab-aggregate";

it("returns null for empty tabs", () => {
  expect(aggregateAutoFrameStates(7, [], () => 1)).toBeNull();
});
