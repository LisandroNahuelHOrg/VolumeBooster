import type { ScopeCallback, ScopeStub } from "../state/scope-stub-types";
import { captureExceptionMock, captureMessageMock, initMock, listenerMap, makeFetchTransportMock, withScopeMock } from "../state/runtime-mocks";
import { createScopeStub } from "./create-scope-stub.callback";
import { loadSentryModule } from "./load-sentry-module.callback";
import { storeListenerMapEntry } from "./store-listener-map-entry.callback";
import { throwSdkInitFailed } from "./throw-sdk-init-failed.callback";
import { throwSdkScopeFailed } from "./throw-sdk-scope-failed.callback";

export async function runIgnoresBlankGlobalErrorMessagesCase() {
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

    listenerMap.get("error")?.({ message: "   " });
    expect(captureExceptionMock).not.toHaveBeenCalled();

    listenerMap.get("error")?.({ message: "string boom" });
    expect(captureExceptionMock).toHaveBeenCalledTimes(1);
    expect((captureExceptionMock.mock.calls[0][0] as Error).message).toBe("string boom");

    listenerMap.get("error")?.({ message: 123 });
    expect(captureExceptionMock).toHaveBeenCalledTimes(1);
}
