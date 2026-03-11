import type { ScopeCallback, ScopeStub, TransportFactory } from "../state/scope-stub-types";
import { captureExceptionMock, captureMessageMock, initMock, listenerMap, makeFetchTransportMock, withScopeMock } from "../state/runtime-mocks";
import { createScopeStub } from "./create-scope-stub.callback";
import { loadSentryModule } from "./load-sentry-module.callback";
import { storeListenerMapEntry } from "./store-listener-map-entry.callback";
import { throwSdkInitFailed } from "./throw-sdk-init-failed.callback";
import { throwSdkScopeFailed } from "./throw-sdk-scope-failed.callback";

export async function runUsesDefaultFetchTransportWithoutNativeFetchCase() {
    const module = await loadSentryModule();
    module.resetSentryStateForTests();

    vi.stubGlobal("fetch", undefined as unknown as typeof fetch);

    module.initSentryForContext("background", {
      MODE: "production",
      VITE_SENTRY_DSN: "https://public@example.ingest.sentry.io/1",
      VITE_SENTRY_SMOKE_MIRROR: "on"
    });

    const [options] = initMock.mock.calls[0] as [Record<string, unknown>];
    const transportFactory = options.transport as TransportFactory;
    const transportOptions = { url: "https://ingest.test/api/1/envelope/" };
    const transport = transportFactory(transportOptions);

    expect(makeFetchTransportMock).toHaveBeenCalledWith(transportOptions);
    expect(transport).toBeTruthy();
}
