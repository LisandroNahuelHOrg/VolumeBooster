import type { ScopeCallback, ScopeStub } from "../state/scope-stub-types";
import { captureExceptionMock, captureMessageMock, initMock, listenerMap, makeFetchTransportMock, withScopeMock } from "../state/runtime-mocks";
import { createScopeStub } from "./create-scope-stub.callback";
import { loadSentryModule } from "./load-sentry-module.callback";
import { storeListenerMapEntry } from "./store-listener-map-entry.callback";
import { throwSdkInitFailed } from "./throw-sdk-init-failed.callback";
import { throwSdkScopeFailed } from "./throw-sdk-scope-failed.callback";

export async function runScrubsSensitiveDataBeforeSendingCase() {
    const module = await loadSentryModule();

    expect(
      module.scrubSentryEvent({
        breadcrumbs: [
          {
            category: "ui.click",
            data: {
              tabTitle: "Secret title",
              tabUrl: "https://example.com/watch?v=1#frag",
              url: "https://example.com/watch?v=1#frag"
            }
          }
        ],
        contexts: {
          tab: {
            favIconUrl: "https://icons.example/favicon.ico",
            url: "https://example.com/watch?v=1#frag"
          }
        },
        extra: {
          nested: {
            tabTitle: "Video title"
          },
          tabUrl: "https://example.com/watch?v=1#frag"
        },
        request: {
          url: "https://sentry.io/api?token=secret"
        },
        tags: {
          tabUrl: "https://example.com/watch?v=1#frag",
          url: "https://example.com/watch?v=1#frag"
        },
        user: {
          id: "123"
        }
      })
    ).toEqual({
      breadcrumbs: [
        {
          category: "ui.click",
          data: {
            tabTitle: "[redacted]",
            tabUrl: "[redacted]",
            url: "https://example.com/watch"
          }
        }
      ],
      contexts: {
        tab: {
          favIconUrl: "[redacted]",
          url: "https://example.com/watch"
        }
      },
      extra: {
        nested: {
          tabTitle: "[redacted]"
        },
        tabUrl: "[redacted]"
      },
      tags: {
        tabUrl: "[redacted]",
        url: "https://example.com/watch"
      }
    });
}
