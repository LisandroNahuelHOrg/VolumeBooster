import type { ScopeCallback, ScopeStub } from "../state/scope-stub-types";
import { captureExceptionMock, captureMessageMock, initMock, listenerMap, makeFetchTransportMock, withScopeMock } from "../state/runtime-mocks";
import { createScopeStub } from "./create-scope-stub.callback";
import { loadSentryModule } from "./load-sentry-module.callback";
import { storeListenerMapEntry } from "./store-listener-map-entry.callback";
import { throwSdkInitFailed } from "./throw-sdk-init-failed.callback";
import { throwSdkScopeFailed } from "./throw-sdk-scope-failed.callback";

export async function runMirrorsTransportEnvelopesWhenSmokeEnabledCase() {
    const module = await loadSentryModule();
    module.resetSentryStateForTests();

    module.initSentryForContext("background", {
      MODE: "production",
      VITE_SENTRY_DSN: "https://public@example.ingest.sentry.io/1",
      VITE_SENTRY_SMOKE_MIRROR: "true"
    });

    const [options] = initMock.mock.calls[0] as [Record<string, unknown>];
    const nativeFetch = vi.fn();
  nativeFetch.mockResolvedValue(new Response(null, { status: 200 }));
    const mirroredFetch = module.createSmokeMirroredFetch(
      "background",
      nativeFetch as unknown as typeof fetch
    );

    await mirroredFetch("https://ingest.test/api/1/envelope/", {
      body: "envelope-body",
      method: "POST"
    });

    expect(typeof options.transport).toBe("function");
    expect(module.readSentrySmokeMirrorForTests()).toEqual([
      {
        body: "envelope-body",
        context: "background",
        statusCode: 200,
        timestamp: expect.any(Number),
        url: "https://ingest.test/api/1/envelope/"
      }
    ]);
}
