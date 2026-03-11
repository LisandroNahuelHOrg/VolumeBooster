import {
  captureExceptionMock,
  captureMessageMock,
  initMock,
  listenerMap,
  makeFetchTransportMock,
  withScopeMock
} from "../state/runtime-mocks";
import { createFetchTransportResult } from "./create-fetch-transport-result.callback";
import { runWithScopeCallback } from "./run-with-scope-callback.callback";

export function resetRuntimeSentrySuite(): void {
  vi.unstubAllGlobals();
  vi.resetModules();
  initMock.mockReset();
  makeFetchTransportMock.mockReset();
  makeFetchTransportMock.mockImplementation(createFetchTransportResult);
  withScopeMock.mockReset();
  withScopeMock.mockImplementation(runWithScopeCallback);
  captureExceptionMock.mockReset();
  captureMessageMock.mockReset();
  listenerMap.clear();
}
