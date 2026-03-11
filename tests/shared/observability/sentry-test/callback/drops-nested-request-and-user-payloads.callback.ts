import type { ScopeCallback, ScopeStub } from "../state/scope-stub-types";
import { captureExceptionMock, captureMessageMock, initMock, listenerMap, makeFetchTransportMock, withScopeMock } from "../state/runtime-mocks";
import { createScopeStub } from "./create-scope-stub.callback";
import { loadSentryModule } from "./load-sentry-module.callback";
import { storeListenerMapEntry } from "./store-listener-map-entry.callback";
import { throwSdkInitFailed } from "./throw-sdk-init-failed.callback";
import { throwSdkScopeFailed } from "./throw-sdk-scope-failed.callback";

export async function runDropsNestedRequestAndUserPayloadsCase() {
    const module = await loadSentryModule();

    expect(
      module.scrubSentryEvent({
        extra: {
          nested: {
            documentUrl: "https://example.com/watch?v=1#frag",
            frameUrl: "https://frames.example.com/player?id=9#inline",
            requestUrl: "/api/status?token=secret#frag",
            request: {
              method: "POST"
            },
            user: {
              id: "sensitive"
            }
          }
        }
      })
    ).toEqual({
      extra: {
        nested: {
          documentUrl: "https://example.com/watch",
          frameUrl: "https://frames.example.com/player",
          requestUrl: "/api/status"
        }
      }
    });
}
