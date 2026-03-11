import type { ScopeCallback, ScopeStub } from "../state/scope-stub-types";
import { captureExceptionMock, captureMessageMock, initMock, listenerMap, makeFetchTransportMock, withScopeMock } from "../state/runtime-mocks";
import { createScopeStub } from "./create-scope-stub.callback";
import { loadSentryModule } from "./load-sentry-module.callback";
import { storeListenerMapEntry } from "./store-listener-map-entry.callback";
import { throwSdkInitFailed } from "./throw-sdk-init-failed.callback";
import { throwSdkScopeFailed } from "./throw-sdk-scope-failed.callback";

export async function runPreservesNonUrlStringsCase() {
    const module = await loadSentryModule();

    expect(
      module.scrubSentryEvent({
        extra: {
          message: "keep?this#intact",
          nested: {
            request: {
              url: "https://secret.test"
            },
            url: "https://example.com/watch?v=5#hash"
          }
        }
      })
    ).toEqual({
      extra: {
        message: "keep?this#intact",
        nested: {
          url: "https://example.com/watch"
        }
      }
    });
}
