import type { ScopeCallback, ScopeStub } from "../state/scope-stub-types";
import { captureExceptionMock, captureMessageMock, initMock, listenerMap, makeFetchTransportMock, withScopeMock } from "../state/runtime-mocks";
import { createScopeStub } from "./create-scope-stub.callback";
import { loadSentryModule } from "./load-sentry-module.callback";
import { storeListenerMapEntry } from "./store-listener-map-entry.callback";
import { throwSdkInitFailed } from "./throw-sdk-init-failed.callback";
import { throwSdkScopeFailed } from "./throw-sdk-scope-failed.callback";

export async function runEnablesSmokeMirrorForTruthyFlagsCase() {
    const module = await loadSentryModule();

    expect(module.isSentrySmokeMirrorEnabled({ VITE_SENTRY_SMOKE_MIRROR: "yes" })).toBe(true);
    expect(module.isSentrySmokeMirrorEnabled({ VITE_SENTRY_SMOKE_MIRROR: "1" })).toBe(true);
    expect(module.isSentrySmokeMirrorEnabled({ VITE_SENTRY_SMOKE_MIRROR: "off" })).toBe(false);
}
