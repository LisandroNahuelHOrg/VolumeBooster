import { makeAutoStatus } from "../../test-harness";

it("makeAutoStatus_builds_default_auto_payload_and_merges_overrides", () => {
  const status = makeAutoStatus({
    autoAttachState: "observing",
    autoAttachReason: "no_media",
    streamState: "inactive",
    gainPercent: 180
  });

  expect(status).toMatchObject({
    tabId: 7,
    title: "YouTube",
    url: "https://youtube.com/watch?v=1",
    domain: "youtube.com",
    favIconUrl: "https://youtube.com/favicon.ico",
    autoAttachState: "observing",
    autoAttachReason: "no_media",
    autoBoosterScope: "global",
    gainPercent: 180,
    engineLane: "auto_media_element",
    streamState: "inactive",
    engineStatus: "ready"
  });
});
