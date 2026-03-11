import {
  captureExceptionMock,
  captureMessageMock,
  initMock,
  makeFetchTransportMock,
  withScopeMock
} from "../state/runtime-mocks";

export function buildBrowserSentryMockModule() {
  return {
    captureException: captureExceptionMock,
    captureMessage: captureMessageMock,
    init: initMock,
    makeFetchTransport: makeFetchTransportMock,
    withScope: withScopeMock
  };
}

vi.mock("@sentry/browser", buildBrowserSentryMockModule);
