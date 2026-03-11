import { makeAttachFailure } from "../../test-harness";

it("makeAttachFailure_preserves_failure_defaults_while_forcing_inactive_auto_lane_shape", () => {
  const attachFailure = makeAttachFailure({
    autoAttachReason: "no_media",
    engineLane: "manual_tab_capture",
    streamState: "active",
    engineStatus: "error"
  });

  expect(attachFailure).toMatchObject({
    tabId: 7,
    title: "YouTube",
    autoAttachState: "failed",
    autoAttachReason: "no_media",
    engineLane: "auto_media_element",
    streamState: "inactive",
    engineStatus: "ready"
  });
});
