import type { ScopeCallback, ScopeStub } from "../state/scope-stub-types";
import { captureExceptionMock, captureMessageMock, initMock, listenerMap, makeFetchTransportMock, withScopeMock } from "../state/runtime-mocks";
import { createScopeStub } from "./create-scope-stub.callback";
import { loadSentryModule } from "./load-sentry-module.callback";
import { storeListenerMapEntry } from "./store-listener-map-entry.callback";
import { throwSdkInitFailed } from "./throw-sdk-init-failed.callback";
import { throwSdkScopeFailed } from "./throw-sdk-scope-failed.callback";

export async function runReusesSdkAcrossContextsCase() {
    const module = await loadSentryModule();
    module.resetSentryStateForTests();

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
    module.initSentryForContext(
      "offscreen",
      {
        MODE: "production",
        VITE_SENTRY_DSN: "https://public@example.ingest.sentry.io/1"
      },
      undefined,
      { addEventListener }
    );

    expect(initMock).toHaveBeenCalledTimes(1);
    expect(addEventListener).toHaveBeenCalledTimes(4);

    module.captureMessageSafe("second context alive", "info", "offscreen");
    expect(captureMessageMock).toHaveBeenCalledWith("second context alive");

    const offscreenScope = withScopeMock.mock.calls.at(-1)?.[0] as ScopeCallback;
    const offscreenScopeInstance = createScopeStub();
    offscreenScope(offscreenScopeInstance);
    expect(offscreenScopeInstance.setTag).toHaveBeenCalledWith("runtime_context", "offscreen");
}
