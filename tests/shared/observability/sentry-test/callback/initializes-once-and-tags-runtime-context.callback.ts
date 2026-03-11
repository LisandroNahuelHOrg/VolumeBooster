import type { IntegrationFilter, ScopeCallback, ScopeStub } from "../state/scope-stub-types";
import { captureExceptionMock, captureMessageMock, initMock, listenerMap, makeFetchTransportMock, withScopeMock } from "../state/runtime-mocks";
import { createScopeStub } from "./create-scope-stub.callback";
import { loadSentryModule } from "./load-sentry-module.callback";
import { mapIntegrationName } from "./map-integration-name.callback";
import { storeListenerMapEntry } from "./store-listener-map-entry.callback";
import { throwSdkInitFailed } from "./throw-sdk-init-failed.callback";
import { throwSdkScopeFailed } from "./throw-sdk-scope-failed.callback";

export async function runInitializesOnceAndTagsRuntimeContextCase() {
    const module = await loadSentryModule();
    module.resetSentryStateForTests();

    const getManifest = vi.fn();
  getManifest.mockReturnValue({ version: "9.9.9" });
    const addEventListener = vi.fn(storeListenerMapEntry);

    module.initSentryForContext(
      "popup",
      {
        DEV: true,
        MODE: "development",
        VITE_SENTRY_DSN: "https://public@example.ingest.sentry.io/1",
        VITE_SENTRY_RELEASE: "release-123"
      },
      { getManifest } as unknown as Pick<typeof chrome.runtime, "getManifest">,
      { addEventListener }
    );
    module.initSentryForContext(
      "popup",
      {
        DEV: true,
        MODE: "development",
        VITE_SENTRY_DSN: "https://public@example.ingest.sentry.io/1",
        VITE_SENTRY_RELEASE: "release-123"
      },
      { getManifest } as unknown as Pick<typeof chrome.runtime, "getManifest">,
      { addEventListener }
    );

    expect(initMock).toHaveBeenCalledTimes(1);
    expect(getManifest).toHaveBeenCalledTimes(1);
    const [options] = initMock.mock.calls[0] as [Record<string, unknown>];
    expect(options.dsn).toBe("https://public@example.ingest.sentry.io/1");
    expect(options.sendDefaultPii).toBe(false);
    expect(options.skipBrowserExtensionCheck).toBe(true);
    expect(options.enabled).toBe(true);
    expect(options.environment).toBe("development");
    expect(options.release).toBe("release-123");
    expect(
      (
        options.integrations as IntegrationFilter
      )([
        { name: "InboundFilters" },
        { name: "FunctionToString" },
        { name: "ConversationId" },
        { name: "BrowserApiErrors" },
        { name: "Breadcrumbs" },
        { name: "GlobalHandlers" },
        { name: "LinkedErrors" },
        { name: "Dedupe" },
        { name: "HttpContext" },
        { name: "CultureContext" },
        { name: "BrowserSession" }
      ]).map(mapIntegrationName)
    ).toEqual([
      "InboundFilters",
      "FunctionToString",
      "LinkedErrors",
      "Dedupe"
    ]);

    const scope = createScopeStub();
    (options.initialScope as ScopeCallback)(scope);
    expect(scope.setTag).toHaveBeenCalledWith("runtime_context", "popup");
    expect(scope.setTag).toHaveBeenCalledWith("environment", "development");
    expect(scope.setTag).toHaveBeenCalledWith("extension_version", "9.9.9");
    expect(scope.setTag).toHaveBeenCalledWith("release", "release-123");
    expect(addEventListener).toHaveBeenCalledTimes(2);
    expect(listenerMap.has("error")).toBe(true);
    expect(listenerMap.has("unhandledrejection")).toBe(true);
}
