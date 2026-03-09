/**
 * @fileoverview Tests the shared Sentry runtime wrapper and privacy scrubber.
 */
const initMock = vi.fn();
const makeFetchTransportMock = vi.fn(() => ({
  flush: vi.fn(async () => true),
  send: vi.fn()
}));
const withScopeMock = vi.fn((callback: (scope: ScopeStub) => void) => {
  callback(createScopeStub());
});
const captureExceptionMock = vi.fn();
const captureMessageMock = vi.fn();

interface ScopeStub {
  setExtras: ReturnType<typeof vi.fn>;
  setLevel: ReturnType<typeof vi.fn>;
  setTag: ReturnType<typeof vi.fn>;
}

function createScopeStub(): ScopeStub {
  return {
    setExtras: vi.fn(),
    setLevel: vi.fn(),
    setTag: vi.fn()
  };
}

vi.mock("@sentry/browser", () => ({
  captureException: captureExceptionMock,
  captureMessage: captureMessageMock,
  init: initMock,
  makeFetchTransport: makeFetchTransportMock,
  withScope: withScopeMock
}));

describe("shared observability sentry wrapper", () => {
  const listenerMap = new Map<string, (event: unknown) => void>();

  beforeEach(() => {
    vi.resetModules();
    initMock.mockReset();
    makeFetchTransportMock.mockReset();
    withScopeMock.mockClear();
    captureExceptionMock.mockReset();
    captureMessageMock.mockReset();
    listenerMap.clear();
  });

  it("is a no-op when no DSN is configured", async () => {
    const module = await import("./sentry");
    module.resetSentryStateForTests();

    module.initSentryForContext("popup", { MODE: "test" });
    module.captureExceptionSafe(new Error("boom"), "popup");
    module.captureMessageSafe("hello", "info", "popup");

    expect(initMock).not.toHaveBeenCalled();
    expect(withScopeMock).not.toHaveBeenCalled();
    expect(captureExceptionMock).not.toHaveBeenCalled();
    expect(captureMessageMock).not.toHaveBeenCalled();
  });

  it("initializes once and tags the runtime context", async () => {
    const module = await import("./sentry");
    module.resetSentryStateForTests();

    const getManifest = vi.fn(() => ({ version: "9.9.9" }));
    const addEventListener = vi.fn((type: string, handler: (event: unknown) => void) => {
      listenerMap.set(type, handler);
    });

    module.initSentryForContext(
      "popup",
      {
        DEV: true,
        MODE: "development",
        VITE_SENTRY_DSN: "https://public@example.ingest.sentry.io/1",
        VITE_SENTRY_RELEASE: "release-123"
      },
      { getManifest } as unknown as Pick<typeof chrome.runtime, "getManifest">,
      { addEventListener }
    );
    module.initSentryForContext(
      "popup",
      {
        DEV: true,
        MODE: "development",
        VITE_SENTRY_DSN: "https://public@example.ingest.sentry.io/1",
        VITE_SENTRY_RELEASE: "release-123"
      },
      { getManifest } as unknown as Pick<typeof chrome.runtime, "getManifest">,
      { addEventListener }
    );

    expect(initMock).toHaveBeenCalledTimes(1);
    const [options] = initMock.mock.calls[0] as [Record<string, unknown>];
    expect(options.dsn).toBe("https://public@example.ingest.sentry.io/1");
    expect(options.sendDefaultPii).toBe(false);
    expect(options.skipBrowserExtensionCheck).toBe(true);
    expect(options.environment).toBe("development");
    expect(options.release).toBe("release-123");
    expect(
      (
        options.integrations as (integrations: Array<{ name: string }>) => Array<{ name: string }>
      )([
        { name: "InboundFilters" },
        { name: "FunctionToString" },
        { name: "ConversationId" },
        { name: "BrowserApiErrors" },
        { name: "Breadcrumbs" },
        { name: "GlobalHandlers" },
        { name: "LinkedErrors" },
        { name: "Dedupe" },
        { name: "HttpContext" },
        { name: "CultureContext" },
        { name: "BrowserSession" }
      ]).map((integration) => integration.name)
    ).toEqual([
      "InboundFilters",
      "FunctionToString",
      "LinkedErrors",
      "Dedupe"
    ]);

    const scope = createScopeStub();
    (options.initialScope as (scope: ScopeStub) => ScopeStub)(scope);
    expect(scope.setTag).toHaveBeenCalledWith("runtime_context", "popup");
    expect(scope.setTag).toHaveBeenCalledWith("environment", "development");
    expect(scope.setTag).toHaveBeenCalledWith("extension_version", "9.9.9");
    expect(scope.setTag).toHaveBeenCalledWith("release", "release-123");
    expect(addEventListener).toHaveBeenCalledTimes(2);
    expect(listenerMap.has("error")).toBe(true);
    expect(listenerMap.has("unhandledrejection")).toBe(true);
  });

  it("scrubs sensitive data from events before sending", async () => {
    const module = await import("./sentry");

    expect(
      module.scrubSentryEvent({
        breadcrumbs: [
          {
            category: "ui.click",
            data: {
              tabTitle: "Secret title",
              tabUrl: "https://example.com/watch?v=1#frag",
              url: "https://example.com/watch?v=1#frag"
            }
          }
        ],
        contexts: {
          tab: {
            favIconUrl: "https://icons.example/favicon.ico",
            url: "https://example.com/watch?v=1#frag"
          }
        },
        extra: {
          nested: {
            tabTitle: "Video title"
          },
          tabUrl: "https://example.com/watch?v=1#frag"
        },
        request: {
          url: "https://sentry.io/api?token=secret"
        },
        tags: {
          tabUrl: "https://example.com/watch?v=1#frag",
          url: "https://example.com/watch?v=1#frag"
        },
        user: {
          id: "123"
        }
      })
    ).toEqual({
      breadcrumbs: [
        {
          category: "ui.click",
          data: {
            tabTitle: "[redacted]",
            tabUrl: "[redacted]",
            url: "https://example.com/watch"
          }
        }
      ],
      contexts: {
        tab: {
          favIconUrl: "[redacted]",
          url: "https://example.com/watch"
        }
      },
      extra: {
        nested: {
          tabTitle: "[redacted]"
        },
        tabUrl: "[redacted]"
      },
      tags: {
        tabUrl: "[redacted]",
        url: "https://example.com/watch"
      }
    });
  });

  it("captures exceptions and messages safely with sanitized extras", async () => {
    const module = await import("./sentry");
    module.resetSentryStateForTests();

    module.initSentryForContext("background", {
      MODE: "production",
      VITE_SENTRY_DSN: "https://public@example.ingest.sentry.io/1"
    });

    module.captureExceptionSafe("plain string error", "background", {
      tabTitle: "Secret tab",
      url: "https://example.com/watch?v=1#frag"
    });
    module.captureMessageSafe("hello", "warning", "background", {
      tabUrl: "https://example.com/watch?v=1#frag"
    });

    expect(withScopeMock).toHaveBeenCalledTimes(2);
    expect(captureExceptionMock).toHaveBeenCalledTimes(1);
    expect(captureExceptionMock.mock.calls[0][0]).toBeInstanceOf(Error);
    expect((captureExceptionMock.mock.calls[0][0] as Error).message).toBe("plain string error");
    expect(captureMessageMock).toHaveBeenCalledWith("hello");

    const exceptionScope = withScopeMock.mock.calls[0][0] as (scope: ScopeStub) => void;
    const exceptionScopeInstance = createScopeStub();
    exceptionScope(exceptionScopeInstance);
    expect(exceptionScopeInstance.setTag).toHaveBeenCalledWith("runtime_context", "background");
    expect(exceptionScopeInstance.setExtras).toHaveBeenCalledWith({
      tabTitle: "[redacted]",
      url: "https://example.com/watch"
    });

    const messageScope = withScopeMock.mock.calls[1][0] as (scope: ScopeStub) => void;
    const messageScopeInstance = createScopeStub();
    messageScope(messageScopeInstance);
    expect(messageScopeInstance.setLevel).toHaveBeenCalledWith("warning");
    expect(messageScopeInstance.setExtras).toHaveBeenCalledWith({
      tabUrl: "[redacted]"
    });
  });

  it("captures uncaught global errors and unhandled rejections via explicit MV3 listeners", async () => {
    const module = await import("./sentry");
    module.resetSentryStateForTests();

    const addEventListener = vi.fn((type: string, handler: (event: unknown) => void) => {
      listenerMap.set(type, handler);
    });

    module.initSentryForContext(
      "popup",
      {
        MODE: "production",
        VITE_SENTRY_DSN: "https://public@example.ingest.sentry.io/1"
      },
      undefined,
      { addEventListener }
    );

    listenerMap.get("error")?.({
      error: new Error("popup uncaught"),
      filename: "chrome-extension://popup.js",
      lineno: 12,
      colno: 4
    });
    listenerMap.get("unhandledrejection")?.({
      reason: new Error("popup rejected")
    });

    expect(captureExceptionMock).toHaveBeenCalledTimes(2);
    expect((captureExceptionMock.mock.calls[0][0] as Error).message).toBe("popup uncaught");
    expect((captureExceptionMock.mock.calls[1][0] as Error).message).toBe("popup rejected");

    const errorScope = withScopeMock.mock.calls[0][0] as (scope: ScopeStub) => void;
    const errorScopeInstance = createScopeStub();
    errorScope(errorScopeInstance);
    expect(errorScopeInstance.setExtras).toHaveBeenCalledWith({
      colno: 4,
      filename: "chrome-extension://popup.js",
      lineno: 12,
      mechanism: "global-error"
    });

    const rejectionScope = withScopeMock.mock.calls[1][0] as (scope: ScopeStub) => void;
    const rejectionScopeInstance = createScopeStub();
    rejectionScope(rejectionScopeInstance);
    expect(rejectionScopeInstance.setExtras).toHaveBeenCalledWith({
      mechanism: "unhandledrejection"
    });
  });

  it("mirrors transport envelopes only when the smoke flag is enabled", async () => {
    const module = await import("./sentry");
    module.resetSentryStateForTests();

    module.initSentryForContext("background", {
      MODE: "production",
      VITE_SENTRY_DSN: "https://public@example.ingest.sentry.io/1",
      VITE_SENTRY_SMOKE_MIRROR: "true"
    });

    const [options] = initMock.mock.calls[0] as [Record<string, unknown>];
    const nativeFetch = vi.fn(async () => new Response(null, { status: 200 }));
    const mirroredFetch = module.createSmokeMirroredFetch(
      "background",
      nativeFetch as unknown as typeof fetch
    );

    await mirroredFetch("https://ingest.test/api/1/envelope/", {
      body: "envelope-body",
      method: "POST"
    });

    expect(typeof options.transport).toBe("function");
    expect(module.readSentrySmokeMirrorForTests()).toEqual([
      {
        body: "envelope-body",
        context: "background",
        statusCode: 200,
        timestamp: expect.any(Number),
        url: "https://ingest.test/api/1/envelope/"
      }
    ]);
  });

  it("swallows SDK failures from init and capture helpers", async () => {
    const module = await import("./sentry");
    module.resetSentryStateForTests();

    initMock.mockImplementationOnce(() => {
      throw new Error("sdk init failed");
    });

    expect(() => {
      module.initSentryForContext("popup", {
        MODE: "production",
        VITE_SENTRY_DSN: "https://public@example.ingest.sentry.io/1"
      });
    }).not.toThrow();

    module.resetSentryStateForTests();
    module.initSentryForContext("popup", {
      MODE: "production",
      VITE_SENTRY_DSN: "https://public@example.ingest.sentry.io/1"
    });

    withScopeMock.mockImplementationOnce(() => {
      throw new Error("sdk scope failed");
    });
    expect(() => {
      module.captureExceptionSafe(new Error("boom"), "popup");
    }).not.toThrow();

    withScopeMock.mockImplementationOnce(() => {
      throw new Error("sdk scope failed");
    });
    expect(() => {
      module.captureMessageSafe("boom", "error", "popup");
    }).not.toThrow();
  });

  it("resolves runtime config from env values", async () => {
    const module = await import("./sentry");

    expect(
      module.resolveSentryRuntimeConfig(
        {
          MODE: "production",
          VITE_SENTRY_DSN: "https://public@example.ingest.sentry.io/1",
          VITE_SENTRY_ENVIRONMENT: "staging",
          VITE_SENTRY_RELEASE: "release-789"
        },
        {
          getManifest: () => ({ version: "1.2.3" })
        } as unknown as Pick<typeof chrome.runtime, "getManifest">
      )
    ).toEqual({
      dsn: "https://public@example.ingest.sentry.io/1",
      enabled: true,
      environment: "staging",
      extensionVersion: "1.2.3",
      release: "release-789"
    });
  });

  it("filters extra telemetry integrations out of the browser defaults", async () => {
    const module = await import("./sentry");

    expect(
      module.filterSentryIntegrations([
        { name: "InboundFilters" },
        { name: "Breadcrumbs" },
        { name: "BrowserApiErrors" },
        { name: "GlobalHandlers" },
        { name: "BrowserSession" },
        { name: "CultureContext" },
        { name: "LinkedErrors" }
      ])
    ).toEqual([
      { name: "InboundFilters" },
      { name: "LinkedErrors" }
    ]);
  });
});
