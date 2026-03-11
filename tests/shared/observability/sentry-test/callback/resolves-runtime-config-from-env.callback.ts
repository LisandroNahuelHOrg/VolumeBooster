import type { ScopeCallback, ScopeStub } from "../state/scope-stub-types";
import { captureExceptionMock, captureMessageMock, initMock, listenerMap, makeFetchTransportMock, withScopeMock } from "../state/runtime-mocks";
import { createScopeStub } from "./create-scope-stub.callback";
import { loadSentryModule } from "./load-sentry-module.callback";
import { storeListenerMapEntry } from "./store-listener-map-entry.callback";
import { throwSdkInitFailed } from "./throw-sdk-init-failed.callback";
import { throwSdkScopeFailed } from "./throw-sdk-scope-failed.callback";

export async function runResolvesRuntimeConfigFromEnvCase() {
    const module = await loadSentryModule();
    const getManifest = vi.fn();
    getManifest.mockReturnValue({ version: "1.2.3" });

    expect(
      module.resolveSentryRuntimeConfig(
        {
          MODE: "production",
          VITE_SENTRY_DSN: "https://public@example.ingest.sentry.io/1",
          VITE_SENTRY_ENVIRONMENT: "staging",
          VITE_SENTRY_RELEASE: "release-789"
        },
        {
          getManifest
        } as unknown as Pick<typeof chrome.runtime, "getManifest">
      )
    ).toEqual({
      dsn: "https://public@example.ingest.sentry.io/1",
      enabled: true,
      environment: "staging",
      extensionVersion: "1.2.3",
      release: "release-789"
    });
}
