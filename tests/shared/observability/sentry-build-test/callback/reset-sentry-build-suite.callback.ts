import { sentryVitePluginMock } from "../state/plugin-mocks";
import { createMockSentryVitePluginResult } from "./create-mock-sentry-vite-plugin-result.callback";

export function resetSentryBuildSuite(): void {
  sentryVitePluginMock.mockClear();
  sentryVitePluginMock.mockImplementation(createMockSentryVitePluginResult);
}
