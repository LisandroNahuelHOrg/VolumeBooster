import type { ScopeCallback, ScopeStub, TransportFactory } from "../state/scope-stub-types";
import { captureExceptionMock, captureMessageMock, initMock, listenerMap, makeFetchTransportMock, withScopeMock } from "../state/runtime-mocks";
import { createScopeStub } from "./create-scope-stub.callback";
import { loadSentryModule } from "./load-sentry-module.callback";
import { storeListenerMapEntry } from "./store-listener-map-entry.callback";
import { throwSdkInitFailed } from "./throw-sdk-init-failed.callback";
import { throwSdkScopeFailed } from "./throw-sdk-scope-failed.callback";

export async function runUsesMirroredNativeFetchTransportCase() {
    const module = await loadSentryModule();
    module.resetSentryStateForTests();

    const nativeFetch = vi.fn();
  nativeFetch.mockResolvedValue(new Response(null, { status: 204 }));
    vi.stubGlobal("fetch", nativeFetch as unknown as typeof fetch);

    module.initSentryForContext("background", {
      MODE: "production",
      VITE_SENTRY_DSN: "https://public@example.ingest.sentry.io/1",
      VITE_SENTRY_SMOKE_MIRROR: "true"
    });

    const [options] = initMock.mock.calls[0] as [Record<string, unknown>];
    const transportFactory = options.transport as TransportFactory;
    const transportOptions = { url: "https://ingest.test/api/1/envelope/" };
    transportFactory(transportOptions);

    expect(makeFetchTransportMock).toHaveBeenCalledTimes(1);
    const firstTransportCall = makeFetchTransportMock.mock.calls[0];
    expect(firstTransportCall).toBeDefined();
    expect(firstTransportCall).toHaveLength(2);

    const [receivedTransportOptions, mirroredFetch] = firstTransportCall as unknown as [
      { url: string },
      typeof fetch
    ];
    expect(receivedTransportOptions).toEqual(transportOptions);
    await mirroredFetch("https://ingest.test/api/real/envelope/");

    expect(module.readSentrySmokeMirrorEntries()).toEqual([
      {
        body: undefined,
        context: "background",
        statusCode: 204,
        timestamp: expect.any(Number),
        url: "https://ingest.test/api/real/envelope/"
      }
    ]);
}
