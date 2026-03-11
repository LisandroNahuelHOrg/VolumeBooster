import type { ScopeCallback, ScopeStub } from "../state/scope-stub-types";
import { captureExceptionMock, captureMessageMock, initMock, listenerMap, makeFetchTransportMock, withScopeMock } from "../state/runtime-mocks";
import { createScopeStub } from "./create-scope-stub.callback";
import { loadSentryModule } from "./load-sentry-module.callback";
import { storeListenerMapEntry } from "./store-listener-map-entry.callback";
import { throwSdkInitFailed } from "./throw-sdk-init-failed.callback";
import { throwSdkScopeFailed } from "./throw-sdk-scope-failed.callback";

export async function runRecordsMirroredFailuresAndKeepsLatestTenCase() {
    const module = await loadSentryModule();
    module.resetSentryStateForTests();

    const failingFetch = vi.fn();
  failingFetch.mockRejectedValue(new Error("network down"));
    const mirroredFailureFetch = module.createSmokeMirroredFetch(
      "background",
      failingFetch as unknown as typeof fetch
    );

    await expect(
      mirroredFailureFetch(new URL("https://ingest.test/api/fail/envelope/"), {
        body: new URLSearchParams({ key: "value" }),
        method: "POST"
      })
    ).rejects.toThrow("network down");

    expect(module.readSentrySmokeMirrorEntries()).toEqual([
      {
        body: "key=value",
        context: "background",
        timestamp: expect.any(Number),
        url: "https://ingest.test/api/fail/envelope/"
      }
    ]);

    module.resetSentrySmokeMirrorForTests();

    const successFetch = vi.fn();
  successFetch.mockResolvedValue(new Response(null, { status: 202 }));
    const mirroredSuccessFetch = module.createSmokeMirroredFetch(
      "background",
      successFetch as unknown as typeof fetch
    );

    for (let index = 0; index < 12; index += 1) {
      await mirroredSuccessFetch(`https://ingest.test/api/${index}/envelope/`, {
        body: new Uint8Array([52, 53]),
        method: "POST"
      });
    }

    const entries = module.readSentrySmokeMirrorEntries();
    expect(entries).toHaveLength(10);
    expect(entries[0]).toMatchObject({
      body: "45",
      context: "background",
      statusCode: 202,
      url: "https://ingest.test/api/2/envelope/"
    });
    expect(entries.at(-1)).toMatchObject({
      url: "https://ingest.test/api/11/envelope/"
    });
}
