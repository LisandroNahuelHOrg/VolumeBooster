import { runFiltersExtraTelemetryIntegrationsCase } from "../callback/filters-extra-telemetry-integrations.callback";

export function registerFiltersExtraTelemetryIntegrationsCase(): void {
  it("filters extra telemetry integrations out of the browser defaults", runFiltersExtraTelemetryIntegrationsCase);
}
