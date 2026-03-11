import type { ScopeCallback, ScopeStub } from "../state/scope-stub-types";
import { captureExceptionMock, captureMessageMock, initMock, listenerMap, makeFetchTransportMock, withScopeMock } from "../state/runtime-mocks";
import { createScopeStub } from "./create-scope-stub.callback";
import { loadSentryModule } from "./load-sentry-module.callback";
import { storeListenerMapEntry } from "./store-listener-map-entry.callback";
import { throwSdkInitFailed } from "./throw-sdk-init-failed.callback";
import { throwSdkScopeFailed } from "./throw-sdk-scope-failed.callback";

export async function runFiltersExtraTelemetryIntegrationsCase() {
    const module = await loadSentryModule();

    expect(
      module.filterSentryIntegrations([
        { name: "InboundFilters" },
        { name: "Breadcrumbs" },
        { name: "BrowserApiErrors" },
        { name: "GlobalHandlers" },
        { name: "BrowserSession" },
        { name: "CultureContext" },
        { name: "LinkedErrors" },
        {}
      ])
    ).toEqual([
      { name: "InboundFilters" },
      { name: "LinkedErrors" },
      {}
    ]);
}
