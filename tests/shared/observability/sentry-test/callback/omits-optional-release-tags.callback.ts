import type { ScopeCallback, ScopeStub } from "../state/scope-stub-types";
import { captureExceptionMock, captureMessageMock, initMock, listenerMap, makeFetchTransportMock, withScopeMock } from "../state/runtime-mocks";
import { createScopeStub } from "./create-scope-stub.callback";
import { loadSentryModule } from "./load-sentry-module.callback";
import { storeListenerMapEntry } from "./store-listener-map-entry.callback";
import { throwSdkInitFailed } from "./throw-sdk-init-failed.callback";
import { throwSdkScopeFailed } from "./throw-sdk-scope-failed.callback";

export async function runOmitsOptionalReleaseTagsCase() {
    const module = await loadSentryModule();
    module.resetSentryStateForTests();

    module.initSentryForContext("automation", {
      MODE: "production",
      VITE_SENTRY_DSN: "https://public@example.ingest.sentry.io/1"
    });

    const [options] = initMock.mock.calls[0] as [Record<string, unknown>];
    const scope = createScopeStub();
    (options.initialScope as ScopeCallback)(scope);

    expect(scope.setTag).toHaveBeenCalledWith("runtime_context", "automation");
    expect(scope.setTag).toHaveBeenCalledWith("environment", "production");
    expect(scope.setTag).not.toHaveBeenCalledWith("extension_version", expect.anything());
    expect(scope.setTag).not.toHaveBeenCalledWith("release", expect.anything());
    expect(scope.setTag).toHaveBeenCalledTimes(2);
}
