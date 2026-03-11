import { makeLevelUpdate } from "../../test-harness";

it("makeLevelUpdate_returns_default_telemetry_snapshot_with_override_precedence", () => {
  const levelUpdate = makeLevelUpdate({
    level: 0.9,
    warning: "danger",
    clipEvents: 4,
    protectionBypassed: true
  });

  expect(levelUpdate).toMatchObject({
    tabId: 7,
    level: 0.9,
    warning: "danger",
    protectorActionDb: 7.5,
    clipEvents: 4,
    clipPeak: 1.1,
    protectionBypassed: true,
    outputPeak: 0.78
  });
});
