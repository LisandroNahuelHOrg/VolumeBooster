import type { ScopeCallback, ScopeStub } from "../state/scope-stub-types";
import { captureExceptionMock, captureMessageMock, initMock, listenerMap, makeFetchTransportMock, withScopeMock } from "../state/runtime-mocks";
import { createScopeStub } from "./create-scope-stub.callback";
import { loadSentryModule } from "./load-sentry-module.callback";
import { storeListenerMapEntry } from "./store-listener-map-entry.callback";
import { throwSdkInitFailed } from "./throw-sdk-init-failed.callback";
import { throwSdkScopeFailed } from "./throw-sdk-scope-failed.callback";

export async function runMirrorsRequestInputsUsingOriginalUrlCase() {
    const module = await loadSentryModule();
    module.resetSentryStateForTests();

    const nativeFetch = vi.fn();
  nativeFetch.mockResolvedValue(new Response(null, { status: 201 }));
    const mirroredFetch = module.createSmokeMirroredFetch("background", nativeFetch as unknown as typeof fetch);
    const request = new Request("https://ingest.test/api/request/envelope/", { method: "POST" });

    await mirroredFetch(request);

    expect(module.readSentrySmokeMirrorEntries()).toEqual([
      {
        body: undefined,
        context: "background",
        statusCode: 201,
        timestamp: expect.any(Number),
        url: "https://ingest.test/api/request/envelope/"
      }
    ]);
}
