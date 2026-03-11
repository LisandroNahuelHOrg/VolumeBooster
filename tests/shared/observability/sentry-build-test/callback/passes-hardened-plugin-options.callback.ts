import { completeBuildEnv } from "../fixtures/build-envs";
import { sentryVitePluginMock } from "../state/plugin-mocks";
import { loadSentryBuildModule } from "./load-sentry-build-module.callback";
import { returnUndefined } from "./return-undefined.callback";

export async function runPassesHardenedPluginOptionsCase() {
  const module = await loadSentryBuildModule();
  const warnSpy = vi.spyOn(console, "warn").mockImplementation(returnUndefined);

  const plugin = module.createSentryVitePlugin({
    ...completeBuildEnv,
    SENTRY_AUTH_TOKEN: " token ",
    SENTRY_ORG: " org ",
    SENTRY_PROJECT: " project ",
    VITE_SENTRY_DSN: " https://public@example.ingest.sentry.io/1 ",
    VITE_SENTRY_RELEASE: " release-123 "
  }) as { name: string; options: Record<string, unknown> };

  expect(plugin).toEqual({
    name: "mock-sentry-vite-plugin",
    options: expect.any(Object)
  });
  expect(sentryVitePluginMock).toHaveBeenCalledTimes(1);

  const options = sentryVitePluginMock.mock.calls[0][0] as {
    authToken: string;
    bundleSizeOptimizations: Record<string, boolean>;
    errorHandler(error: Error): void;
    org: string;
    project: string;
    release: Record<string, unknown>;
    telemetry: boolean;
  };

  expect(options.authToken).toBe("token");
  expect(options.org).toBe("org");
  expect(options.project).toBe("project");
  expect(options.telemetry).toBe(false);
  expect(options.release).toEqual({
    name: "release-123",
    inject: false,
    setCommits: false
  });
  expect(options.bundleSizeOptimizations).toEqual({
    excludeReplayIframe: true,
    excludeReplayShadowDom: true,
    excludeReplayWorker: true,
    excludeTracing: true
  });

  options.errorHandler(new Error("upload failed"));
  expect(warnSpy).toHaveBeenCalledWith("[sentry-vite-plugin] upload failed");
  warnSpy.mockRestore();
}
