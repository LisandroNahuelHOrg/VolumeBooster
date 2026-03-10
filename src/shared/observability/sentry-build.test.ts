/**
 * @fileoverview Tests the build-time Sentry helper used by Vite.
 */
const { sentryVitePluginMock } = vi.hoisted(() => ({
  sentryVitePluginMock: vi.fn((options: unknown) => ({
    name: "mock-sentry-vite-plugin",
    options
  }))
}));

vi.mock("@sentry/vite-plugin", () => ({
  sentryVitePlugin: sentryVitePluginMock
}));

import {
  createSentryVitePlugin,
  getSentryBuildSourcemapMode,
  isSentryRuntimeEnabled,
  isSentrySourcemapUploadEnabled
} from "./sentry-build";

describe("sentry build helper", () => {
  beforeEach(() => {
    sentryVitePluginMock.mockClear();
  });

  it("enables runtime only when a DSN exists", () => {
    expect(isSentryRuntimeEnabled({})).toBe(false);
    expect(isSentryRuntimeEnabled({ VITE_SENTRY_DSN: "" })).toBe(false);
    expect(isSentryRuntimeEnabled({ VITE_SENTRY_DSN: "   " })).toBe(false);
    expect(isSentryRuntimeEnabled({ VITE_SENTRY_DSN: "https://public@example.ingest.sentry.io/1" })).toBe(true);
  });

  it("only enables sourcemap upload when all release credentials are present", () => {
    expect(
      isSentrySourcemapUploadEnabled({
        VITE_SENTRY_RELEASE: "release-123",
        SENTRY_AUTH_TOKEN: "token",
        SENTRY_ORG: "org",
        SENTRY_PROJECT: "project"
      })
    ).toBe(false);

    expect(
      isSentrySourcemapUploadEnabled({
        VITE_SENTRY_DSN: "https://public@example.ingest.sentry.io/1",
        VITE_SENTRY_RELEASE: "release-123",
        SENTRY_AUTH_TOKEN: "token",
        SENTRY_ORG: "org"
      })
    ).toBe(false);

    expect(
      isSentrySourcemapUploadEnabled({
        VITE_SENTRY_DSN: "https://public@example.ingest.sentry.io/1",
        VITE_SENTRY_RELEASE: "release-123",
        SENTRY_AUTH_TOKEN: "token",
        SENTRY_ORG: "org",
        SENTRY_PROJECT: "project"
      })
    ).toBe(true);

    expect(
      isSentrySourcemapUploadEnabled({
        VITE_SENTRY_DSN: "https://public@example.ingest.sentry.io/1",
        VITE_SENTRY_RELEASE: "release-123",
        SENTRY_AUTH_TOKEN: "token",
        SENTRY_ORG: " ",
        SENTRY_PROJECT: "project"
      })
    ).toBe(false);
  });

  it("only emits hidden sourcemaps when runtime and upload credentials are both enabled", () => {
    expect(getSentryBuildSourcemapMode({})).toBe(false);
    expect(
      getSentryBuildSourcemapMode({
        VITE_SENTRY_DSN: "https://public@example.ingest.sentry.io/1"
      })
    ).toBe(false);
    expect(
      getSentryBuildSourcemapMode({
        VITE_SENTRY_DSN: "https://public@example.ingest.sentry.io/1",
        VITE_SENTRY_RELEASE: "release-123",
        SENTRY_AUTH_TOKEN: "token",
        SENTRY_ORG: "org",
        SENTRY_PROJECT: "project"
      })
    ).toBe("hidden");
  });

  it("creates the Vite plugin only when upload credentials exist", () => {
    expect(createSentryVitePlugin({})).toBeNull();

    expect(
      createSentryVitePlugin({
        VITE_SENTRY_DSN: "https://public@example.ingest.sentry.io/1",
        VITE_SENTRY_RELEASE: "release-123",
        SENTRY_AUTH_TOKEN: "token",
        SENTRY_ORG: "org",
        SENTRY_PROJECT: "project"
      })
    ).toBeTruthy();
  });

  it("returns null when any upload credential is blank after trimming", () => {
    expect(
      createSentryVitePlugin({
        VITE_SENTRY_DSN: "https://public@example.ingest.sentry.io/1",
        VITE_SENTRY_RELEASE: "release-123",
        SENTRY_AUTH_TOKEN: "token",
        SENTRY_ORG: "org",
        SENTRY_PROJECT: "   "
      })
    ).toBeNull();
  });

  it.each([
    {
      name: "missing DSN",
      env: {
        VITE_SENTRY_RELEASE: "release-123",
        SENTRY_AUTH_TOKEN: "token",
        SENTRY_ORG: "org",
        SENTRY_PROJECT: "project"
      }
    },
    {
      name: "missing auth token",
      env: {
        VITE_SENTRY_DSN: "https://public@example.ingest.sentry.io/1",
        VITE_SENTRY_RELEASE: "release-123",
        SENTRY_ORG: "org",
        SENTRY_PROJECT: "project"
      }
    },
    {
      name: "missing org",
      env: {
        VITE_SENTRY_DSN: "https://public@example.ingest.sentry.io/1",
        VITE_SENTRY_RELEASE: "release-123",
        SENTRY_AUTH_TOKEN: "token",
        SENTRY_PROJECT: "project"
      }
    },
    {
      name: "missing project",
      env: {
        VITE_SENTRY_DSN: "https://public@example.ingest.sentry.io/1",
        VITE_SENTRY_RELEASE: "release-123",
        SENTRY_AUTH_TOKEN: "token",
        SENTRY_ORG: "org"
      }
    },
    {
      name: "missing release",
      env: {
        VITE_SENTRY_DSN: "https://public@example.ingest.sentry.io/1",
        SENTRY_AUTH_TOKEN: "token",
        SENTRY_ORG: "org",
        SENTRY_PROJECT: "project"
      }
    }
  ])("does not create the Vite plugin when upload setup is incomplete: $name", ({ env }) => {
    expect(createSentryVitePlugin(env)).toBeNull();
    expect(sentryVitePluginMock).not.toHaveBeenCalled();
  });

  it("passes the hardened plugin options and warning handler through to Sentry", () => {
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => undefined);

    const plugin = createSentryVitePlugin({
      VITE_SENTRY_DSN: " https://public@example.ingest.sentry.io/1 ",
      VITE_SENTRY_RELEASE: " release-123 ",
      SENTRY_AUTH_TOKEN: " token ",
      SENTRY_ORG: " org ",
      SENTRY_PROJECT: " project "
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
  });
});
