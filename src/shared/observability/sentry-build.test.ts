/**
 * @fileoverview Tests the build-time Sentry helper used by Vite.
 */
import {
  createSentryVitePlugin,
  getSentryBuildSourcemapMode,
  isSentryRuntimeEnabled,
  isSentrySourcemapUploadEnabled
} from "./sentry-build";

describe("sentry build helper", () => {
  it("enables runtime only when a DSN exists", () => {
    expect(isSentryRuntimeEnabled({})).toBe(false);
    expect(isSentryRuntimeEnabled({ VITE_SENTRY_DSN: "" })).toBe(false);
    expect(isSentryRuntimeEnabled({ VITE_SENTRY_DSN: "https://public@example.ingest.sentry.io/1" })).toBe(true);
  });

  it("only enables sourcemap upload when all release credentials are present", () => {
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
});
