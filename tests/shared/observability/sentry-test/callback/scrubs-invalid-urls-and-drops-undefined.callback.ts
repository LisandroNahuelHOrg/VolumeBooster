import type { ScopeCallback, ScopeStub } from "../state/scope-stub-types";
import { captureExceptionMock, captureMessageMock, initMock, listenerMap, makeFetchTransportMock, withScopeMock } from "../state/runtime-mocks";
import { createScopeStub } from "./create-scope-stub.callback";
import { loadSentryModule } from "./load-sentry-module.callback";
import { storeListenerMapEntry } from "./store-listener-map-entry.callback";
import { throwSdkInitFailed } from "./throw-sdk-init-failed.callback";
import { throwSdkScopeFailed } from "./throw-sdk-scope-failed.callback";

export async function runScrubsInvalidUrlsAndDropsUndefinedCase() {
    const module = await loadSentryModule();

    expect(
      module.scrubSentryEvent({
        extra: {
          href: "#frag",
          pageUrl: "?watch=123#frag",
          url: "/watch?v=123#frag",
          values: [undefined, null, { tabUrl: "https://example.com/watch?v=1#frag" }]
        }
      })
    ).toEqual({
      extra: {
        href: "",
        pageUrl: "",
        url: "/watch",
        values: [null, { tabUrl: "[redacted]" }]
      }
    });
}
