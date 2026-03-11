import type { ScopeCallback, ScopeStub } from "../state/scope-stub-types";
import { captureExceptionMock, captureMessageMock, initMock, listenerMap, makeFetchTransportMock, withScopeMock } from "../state/runtime-mocks";
import { createScopeStub } from "./create-scope-stub.callback";
import { loadSentryModule } from "./load-sentry-module.callback";
import { storeListenerMapEntry } from "./store-listener-map-entry.callback";
import { throwSdkInitFailed } from "./throw-sdk-init-failed.callback";
import { throwSdkScopeFailed } from "./throw-sdk-scope-failed.callback";

export async function runSwallowsSdkFailuresCase() {
    const module = await loadSentryModule();
    module.resetSentryStateForTests();

    initMock.mockImplementationOnce(throwSdkInitFailed);

          module.initSentryForContext("popup", {
        MODE: "production",
        VITE_SENTRY_DSN: "https://public@example.ingest.sentry.io/1"
      });

    module.captureExceptionSafe(new Error("boom"), "popup");
    module.captureMessageSafe("boom", "error", "popup");
    expect(withScopeMock).not.toHaveBeenCalled();
    expect(captureExceptionMock).not.toHaveBeenCalled();
    expect(captureMessageMock).not.toHaveBeenCalled();

    module.resetSentryStateForTests();
    module.initSentryForContext("popup", {
      MODE: "production",
      VITE_SENTRY_DSN: "https://public@example.ingest.sentry.io/1"
    });

    withScopeMock.mockImplementationOnce(throwSdkScopeFailed);
          module.captureExceptionSafe(new Error("boom"), "popup");

    withScopeMock.mockImplementationOnce(throwSdkScopeFailed);
          module.captureMessageSafe("boom", "error", "popup");
}
