import type { ScopeCallback, ScopeStub } from "../state/scope-stub-types";
import { captureExceptionMock, captureMessageMock, initMock, listenerMap, makeFetchTransportMock, withScopeMock } from "../state/runtime-mocks";
import { createScopeStub } from "./create-scope-stub.callback";
import { loadSentryModule } from "./load-sentry-module.callback";
import { storeListenerMapEntry } from "./store-listener-map-entry.callback";
import { throwSdkInitFailed } from "./throw-sdk-init-failed.callback";
import { throwSdkScopeFailed } from "./throw-sdk-scope-failed.callback";

export async function runResetsMirroredTransportBufferCase() {
    const module = await loadSentryModule();
    module.resetSentryStateForTests();

    expect(module.readSentrySmokeMirrorEntries()).toEqual([]);

    const nativeFetch = vi.fn();
  nativeFetch.mockResolvedValue(new Response(null, { status: 200 }));
    const mirroredFetch = module.createSmokeMirroredFetch("background", nativeFetch as unknown as typeof fetch);

    await mirroredFetch("https://ingest.test/api/1/envelope/", { method: "POST" });
    expect(module.readSentrySmokeMirrorEntries()).toHaveLength(1);

    module.resetSentrySmokeMirrorForTests();
    expect(module.readSentrySmokeMirrorEntries()).toEqual([]);
}
