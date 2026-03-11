import { aggregateAutoFrameStates } from "../../auto-tab-aggregate";
import { makeAutoFrameRuntimeState } from "./make-auto-frame-runtime-state";

it("falls back to the first frame when there is neither a top frame nor an attached frame", () => {
  const aggregation = aggregateAutoFrameStates(
    32,
    [
      makeAutoFrameRuntimeState({ frameId: 3, isTopFrame: false, title: "First observer", url: "https://first.example/watch", domain: "first.example", autoAttachState: "observing", autoAttachReason: "no_media", gainPercent: 321 }),
      makeAutoFrameRuntimeState({ frameId: 4, isTopFrame: false, title: "Second observer", url: "https://second.example/watch", domain: "second.example", autoAttachState: "failed", autoAttachReason: "attach_failed" })
    ],
    () => 444
  );

  expect(aggregation).toMatchObject({
    tabState: { title: "First observer", url: "https://first.example/watch", domain: "first.example", gainPercent: 321, autoAttachState: "observing", autoAttachReason: "no_media" },
    session: null
  });
});
