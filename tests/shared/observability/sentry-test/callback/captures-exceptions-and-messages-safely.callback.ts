import type { ScopeCallback, ScopeStub } from "../state/scope-stub-types";
import { captureExceptionMock, captureMessageMock, initMock, listenerMap, makeFetchTransportMock, withScopeMock } from "../state/runtime-mocks";
import { createScopeStub } from "./create-scope-stub.callback";
import { loadSentryModule } from "./load-sentry-module.callback";
import { storeListenerMapEntry } from "./store-listener-map-entry.callback";
import { throwSdkInitFailed } from "./throw-sdk-init-failed.callback";
import { throwSdkScopeFailed } from "./throw-sdk-scope-failed.callback";

export async function runCapturesExceptionsAndMessagesSafelyCase() {
    const module = await loadSentryModule();
    module.resetSentryStateForTests();

    module.initSentryForContext("background", {
      MODE: "production",
      VITE_SENTRY_DSN: "https://public@example.ingest.sentry.io/1"
    });

    module.captureExceptionSafe("plain string error", "background", {
      tabTitle: "Secret tab",
      url: "https://example.com/watch?v=1#frag"
    });
    module.captureMessageSafe("hello", "warning", "background", {
      tabUrl: "https://example.com/watch?v=1#frag"
    });

    expect(withScopeMock).toHaveBeenCalledTimes(2);
    expect(captureExceptionMock).toHaveBeenCalledTimes(1);
    expect(captureExceptionMock.mock.calls[0][0]).toBeInstanceOf(Error);
    expect((captureExceptionMock.mock.calls[0][0] as Error).message).toBe("plain string error");
    expect(captureMessageMock).toHaveBeenCalledWith("hello");

    const exceptionScope = withScopeMock.mock.calls[0][0] as ScopeCallback;
    const exceptionScopeInstance = createScopeStub();
    exceptionScope(exceptionScopeInstance);
    expect(exceptionScopeInstance.setTag).toHaveBeenCalledWith("runtime_context", "background");
    expect(exceptionScopeInstance.setExtras).toHaveBeenCalledWith({
      tabTitle: "[redacted]",
      url: "https://example.com/watch"
    });

    const messageScope = withScopeMock.mock.calls[1][0] as ScopeCallback;
    const messageScopeInstance = createScopeStub();
    messageScope(messageScopeInstance);
    expect(messageScopeInstance.setLevel).toHaveBeenCalledWith("warning");
    expect(messageScopeInstance.setExtras).toHaveBeenCalledWith({
      tabUrl: "[redacted]"
    });
}
