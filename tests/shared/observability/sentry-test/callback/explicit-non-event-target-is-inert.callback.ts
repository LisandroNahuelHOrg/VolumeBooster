import type { ScopeCallback, ScopeStub } from "../state/scope-stub-types";
import { captureExceptionMock, captureMessageMock, initMock, listenerMap, makeFetchTransportMock, withScopeMock } from "../state/runtime-mocks";
import { createScopeStub } from "./create-scope-stub.callback";
import { loadSentryModule } from "./load-sentry-module.callback";
import { storeListenerMapEntry } from "./store-listener-map-entry.callback";
import { throwSdkInitFailed } from "./throw-sdk-init-failed.callback";
import { throwSdkScopeFailed } from "./throw-sdk-scope-failed.callback";

export async function runExplicitNonEventTargetIsInertCase() {
    const module = await loadSentryModule();
    module.resetSentryStateForTests();

    module.initSentryForContext(
      "popup",
      {
        MODE: "production",
        VITE_SENTRY_DSN: "https://public@example.ingest.sentry.io/1"
      },
      undefined,
      {} as unknown as EventTarget
    );

    expect(initMock).toHaveBeenCalledTimes(1);

    const addEventListener = vi.fn();
    module.initSentryForContext(
      "popup",
      {
        MODE: "production",
        VITE_SENTRY_DSN: "https://public@example.ingest.sentry.io/1"
      },
      undefined,
      { addEventListener }
    );

    expect(initMock).toHaveBeenCalledTimes(1);
    expect(addEventListener).not.toHaveBeenCalled();
}
