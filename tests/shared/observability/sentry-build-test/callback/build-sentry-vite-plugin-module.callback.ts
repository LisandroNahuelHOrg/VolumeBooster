import { sentryVitePluginMock } from "../state/plugin-mocks";

export function buildSentryVitePluginModule() {
  return {
    sentryVitePlugin: sentryVitePluginMock
  };
}

vi.mock("@sentry/vite-plugin", buildSentryVitePluginModule);
