import type { ScopeCallback, ScopeStub } from "../state/scope-stub-types";
import { captureExceptionMock, captureMessageMock, initMock, listenerMap, makeFetchTransportMock, withScopeMock } from "../state/runtime-mocks";
import { createScopeStub } from "./create-scope-stub.callback";
import { loadSentryModule } from "./load-sentry-module.callback";
import { storeListenerMapEntry } from "./store-listener-map-entry.callback";
import { throwSdkInitFailed } from "./throw-sdk-init-failed.callback";
import { throwSdkScopeFailed } from "./throw-sdk-scope-failed.callback";

export async function runTrimsRuntimeConfigValuesAndFallsBackToModeCase() {
    const module = await loadSentryModule();

    expect(
      module.resolveSentryRuntimeConfig(
        {
          MODE: "staging",
          VITE_SENTRY_DSN: " https://public@example.ingest.sentry.io/1 ",
          VITE_SENTRY_ENVIRONMENT: "   ",
          VITE_SENTRY_RELEASE: " release-789 "
        },
        undefined
      )
    ).toEqual({
      dsn: "https://public@example.ingest.sentry.io/1",
      enabled: true,
      environment: "staging",
      extensionVersion: undefined,
      release: "release-789"
    });
}
