// @vitest-environment happy-dom

import { expect, test } from "vitest";
import { syncVolumeNormalizationTelemetry } from "./sync-volume-normalization-telemetry";

test("syncs normalization telemetry values into the existing popup card without rerendering markup", () => {
  document.body.innerHTML = `
    <div data-role="normalization-offset-value">0</div>
    <div data-role="normalization-correction-value">+0.0 dB</div>
    <div data-role="normalization-action-value">Holding</div>
    <div data-role="normalization-load-value">0%</div>
    <span data-role="normalization-offset-thumb" style="left:50%"></span>
  `;

  syncVolumeNormalizationTelemetry(
    document.body,
    {
      normalizationTelemetryDisplayKey: "norm:-36:+4.2:raising:35",
      renderModel: {
        normalizationOffsetScore: "-36",
        normalizationCorrection: "+4.2 dB",
        normalizationAction: "Raising",
        normalizationLoad: "35%",
        normalizationOffsetPositionPercent: 32
      }
    } as never,
    {
      lastProtectorTelemetryUiAt: 0,
      lastProtectorTelemetryDisplayKey: "",
      lastNormalizationTelemetryUiAt: 0,
      lastNormalizationTelemetryDisplayKey: "",
      lastLaneStatusDisplayKey: "",
      lastSessionBoostVisible: false
    }
  );

  expect(document.querySelector("[data-role='normalization-offset-value']")?.textContent).toBe("-36");
  expect(document.querySelector("[data-role='normalization-correction-value']")?.textContent).toBe("+4.2 dB");
  expect(document.querySelector("[data-role='normalization-action-value']")?.textContent).toBe("Raising");
  expect(document.querySelector("[data-role='normalization-load-value']")?.textContent).toBe("35%");
  expect(
    document.querySelector<HTMLElement>("[data-role='normalization-offset-thumb']")?.style.left
  ).toBe("32%");
});
