import { makeSession } from "../../test-harness";

it("makeSession_builds_default_manual_session_shape_and_lets_overrides_win", () => {
  const session = makeSession(5, "example.com", 230, {
    title: "CustomTitle",
    warning: "high",
    updatedAt: 99,
    outputPeak: 0.91
  });

  expect(session).toMatchObject({
    tabId: 5,
    title: "CustomTitle",
    url: "https://example.com/video",
    domain: "example.com",
    favIconUrl: "https://example.com/favicon.ico",
    gainPercent: 230,
    engineLane: "manual_tab_capture",
    autoAttachState: "idle",
    streamState: "active",
    engineStatus: "ready",
    level: 0.3,
    warning: "high",
    protectionBypassed: false,
    outputPeak: 0.91,
    updatedAt: 99
  });
});
