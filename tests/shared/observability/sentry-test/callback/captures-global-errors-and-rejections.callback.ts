import type { ScopeCallback, ScopeStub } from "../state/scope-stub-types";
import { captureExceptionMock, captureMessageMock, initMock, listenerMap, makeFetchTransportMock, withScopeMock } from "../state/runtime-mocks";
import { createScopeStub } from "./create-scope-stub.callback";
import { loadSentryModule } from "./load-sentry-module.callback";
import { storeListenerMapEntry } from "./store-listener-map-entry.callback";
import { throwSdkInitFailed } from "./throw-sdk-init-failed.callback";
import { throwSdkScopeFailed } from "./throw-sdk-scope-failed.callback";

export async function runCapturesGlobalErrorsAndRejectionsCase() {
    const module = await loadSentryModule();
    module.resetSentryStateForTests();

    const addEventListener = vi.fn(storeListenerMapEntry);

    module.initSentryForContext(
      "popup",
      {
        MODE: "production",
        VITE_SENTRY_DSN: "https://public@example.ingest.sentry.io/1"
      },
      undefined,
      { addEventListener }
    );

    listenerMap.get("error")?.({
      error: new Error("popup uncaught"),
      filename: "chrome-extension://popup.js",
      lineno: 12,
      colno: 4
    });
    listenerMap.get("unhandledrejection")?.({
      reason: new Error("popup rejected")
    });

    expect(captureExceptionMock).toHaveBeenCalledTimes(2);
    expect((captureExceptionMock.mock.calls[0][0] as Error).message).toBe("popup uncaught");
    expect((captureExceptionMock.mock.calls[1][0] as Error).message).toBe("popup rejected");

    const errorScope = withScopeMock.mock.calls[0][0] as ScopeCallback;
    const errorScopeInstance = createScopeStub();
    errorScope(errorScopeInstance);
    expect(errorScopeInstance.setExtras).toHaveBeenCalledWith({
      colno: 4,
      filename: "chrome-extension://popup.js",
      lineno: 12,
      mechanism: "global-error"
    });

    const rejectionScope = withScopeMock.mock.calls[1][0] as ScopeCallback;
    const rejectionScopeInstance = createScopeStub();
    rejectionScope(rejectionScopeInstance);
    expect(rejectionScopeInstance.setExtras).toHaveBeenCalledWith({
      mechanism: "unhandledrejection"
    });
}
