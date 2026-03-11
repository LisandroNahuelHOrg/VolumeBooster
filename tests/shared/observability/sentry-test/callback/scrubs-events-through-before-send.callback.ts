import type { EventScrubber, ScopeCallback, ScopeStub } from "../state/scope-stub-types";
import { captureExceptionMock, captureMessageMock, initMock, listenerMap, makeFetchTransportMock, withScopeMock } from "../state/runtime-mocks";
import { createScopeStub } from "./create-scope-stub.callback";
import { loadSentryModule } from "./load-sentry-module.callback";
import { storeListenerMapEntry } from "./store-listener-map-entry.callback";
import { throwSdkInitFailed } from "./throw-sdk-init-failed.callback";
import { throwSdkScopeFailed } from "./throw-sdk-scope-failed.callback";

export async function runScrubsEventsThroughBeforeSendCase() {
    const module = await loadSentryModule();
    module.resetSentryStateForTests();

    module.initSentryForContext("popup", {
      MODE: "production",
      VITE_SENTRY_DSN: "https://public@example.ingest.sentry.io/1"
    });

    const [options] = initMock.mock.calls[0] as [Record<string, unknown>];
    const scrubbed = (options.beforeSend as EventScrubber)({
      extra: {
        tabTitle: "Hidden title"
      },
      request: {
        url: "https://secret.test"
      },
      tags: {
        url: "https://example.com/watch?v=1#frag"
      }
    });

    expect(scrubbed).toEqual({
      extra: {
        tabTitle: "[redacted]"
      },
      tags: {
        url: "https://example.com/watch"
      }
    });
}
