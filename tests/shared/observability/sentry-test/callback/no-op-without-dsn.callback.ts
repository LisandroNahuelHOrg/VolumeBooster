import type { ScopeCallback, ScopeStub } from "../state/scope-stub-types";
import { captureExceptionMock, captureMessageMock, initMock, listenerMap, makeFetchTransportMock, withScopeMock } from "../state/runtime-mocks";
import { createScopeStub } from "./create-scope-stub.callback";
import { loadSentryModule } from "./load-sentry-module.callback";
import { storeListenerMapEntry } from "./store-listener-map-entry.callback";
import { throwSdkInitFailed } from "./throw-sdk-init-failed.callback";
import { throwSdkScopeFailed } from "./throw-sdk-scope-failed.callback";

export async function runNoOpWithoutDsnCase() {
    const module = await loadSentryModule();
    module.resetSentryStateForTests();

    module.initSentryForContext("popup", { MODE: "test" });
    module.captureExceptionSafe(new Error("boom"), "popup");
    module.captureMessageSafe("hello", "info", "popup");

    expect(initMock).not.toHaveBeenCalled();
    expect(withScopeMock).not.toHaveBeenCalled();
    expect(captureExceptionMock).not.toHaveBeenCalled();
    expect(captureMessageMock).not.toHaveBeenCalled();
}
