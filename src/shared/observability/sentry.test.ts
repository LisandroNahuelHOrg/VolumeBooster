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
    vi.unstubAllGlobals();
    vi.resetModules();
    initMock.mockReset();
    makeFetchTransportMock.mockReset();
    makeFetchTransportMock.mockImplementation(() => ({
      flush: vi.fn(async () => true),
      send: vi.fn()
    }));
    withScopeMock.mockReset();
    withScopeMock.mockImplementation((callback: (scope: ScopeStub) => void) => {
      callback(createScopeStub());
    });
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

  it("keeps capture helpers inert before any runtime context has been initialized", async () => {
    const module = await import("./sentry");

    module.captureExceptionSafe(new Error("boom"), "popup");
    module.captureMessageSafe("hello", "info", "popup");

    expect(initMock).not.toHaveBeenCalled();
    expect(withScopeMock).not.toHaveBeenCalled();
    expect(captureExceptionMock).not.toHaveBeenCalled();
    expect(captureMessageMock).not.toHaveBeenCalled();
  });

  it("bootstraps Sentry on a fresh module import without requiring an explicit reset", async () => {
    const module = await import("./sentry");

    module.initSentryForContext("popup", {
      MODE: "production",
      VITE_SENTRY_DSN: "https://public@example.ingest.sentry.io/1"
    });

    expect(initMock).toHaveBeenCalledTimes(1);
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
    expect(getManifest).toHaveBeenCalledTimes(1);
    const [options] = initMock.mock.calls[0] as [Record<string, unknown>];
    expect(options.dsn).toBe("https://public@example.ingest.sentry.io/1");
    expect(options.sendDefaultPii).toBe(false);
    expect(options.skipBrowserExtensionCheck).toBe(true);
    expect(options.enabled).toBe(true);
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

  it("reuses the initialized sdk for a second runtime context without reinitializing", async () => {
    const module = await import("./sentry");
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

    const offscreenScope = withScopeMock.mock.calls.at(-1)?.[0] as (scope: ScopeStub) => void;
    const offscreenScopeInstance = createScopeStub();
    offscreenScope(offscreenScopeInstance);
    expect(offscreenScopeInstance.setTag).toHaveBeenCalledWith("runtime_context", "offscreen");
  });

  it("omits optional release tags when manifest version and release are unavailable", async () => {
    const module = await import("./sentry");
    module.resetSentryStateForTests();

    module.initSentryForContext("automation", {
      MODE: "production",
      VITE_SENTRY_DSN: "https://public@example.ingest.sentry.io/1"
    });

    const [options] = initMock.mock.calls[0] as [Record<string, unknown>];
    const scope = createScopeStub();
    (options.initialScope as (scope: ScopeStub) => ScopeStub)(scope);

    expect(scope.setTag).toHaveBeenCalledWith("runtime_context", "automation");
    expect(scope.setTag).toHaveBeenCalledWith("environment", "production");
    expect(scope.setTag).not.toHaveBeenCalledWith("extension_version", expect.anything());
    expect(scope.setTag).not.toHaveBeenCalledWith("release", expect.anything());
    expect(scope.setTag).toHaveBeenCalledTimes(2);
  });

  it("binds listeners through the global event target when no explicit target is provided", async () => {
    const module = await import("./sentry");
    module.resetSentryStateForTests();

    const addEventListener = vi.fn();
    vi.stubGlobal("addEventListener", addEventListener);

    module.initSentryForContext("popup", {
      MODE: "production",
      VITE_SENTRY_DSN: "https://public@example.ingest.sentry.io/1"
    });

    expect(addEventListener).toHaveBeenCalledTimes(2);
  });

  it("treats an explicit non-event-target object as inert and preserves initialization state", async () => {
    const module = await import("./sentry");
    module.resetSentryStateForTests();

    module.initSentryForContext(
      "popup",
      {
        MODE: "production",
        VITE_SENTRY_DSN: "https://public@example.ingest.sentry.io/1"
      },
      undefined,
      {} as unknown as EventTarget
    );

    expect(initMock).toHaveBeenCalledTimes(1);

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

    expect(initMock).toHaveBeenCalledTimes(1);
    expect(addEventListener).not.toHaveBeenCalled();
  });

  it("uses the default fetch transport when smoke mirroring is enabled without a native fetch", async () => {
    const module = await import("./sentry");
    module.resetSentryStateForTests();

    vi.stubGlobal("fetch", undefined as unknown as typeof fetch);

    module.initSentryForContext("background", {
      MODE: "production",
      VITE_SENTRY_DSN: "https://public@example.ingest.sentry.io/1",
      VITE_SENTRY_SMOKE_MIRROR: "on"
    });

    const [options] = initMock.mock.calls[0] as [Record<string, unknown>];
    const transportFactory = options.transport as (options: { url: string }) => unknown;
    const transportOptions = { url: "https://ingest.test/api/1/envelope/" };
    const transport = transportFactory(transportOptions);

    expect(makeFetchTransportMock).toHaveBeenCalledWith(transportOptions);
    expect(transport).toBeTruthy();
  });

  it("uses a mirrored native fetch transport when smoke mirroring is enabled and fetch exists", async () => {
    const module = await import("./sentry");
    module.resetSentryStateForTests();

    const nativeFetch = vi.fn(async () => new Response(null, { status: 204 }));
    vi.stubGlobal("fetch", nativeFetch as unknown as typeof fetch);

    module.initSentryForContext("background", {
      MODE: "production",
      VITE_SENTRY_DSN: "https://public@example.ingest.sentry.io/1",
      VITE_SENTRY_SMOKE_MIRROR: "true"
    });

    const [options] = initMock.mock.calls[0] as [Record<string, unknown>];
    const transportFactory = options.transport as (options: { url: string }) => unknown;
    const transportOptions = { url: "https://ingest.test/api/1/envelope/" };
    transportFactory(transportOptions);

    expect(makeFetchTransportMock).toHaveBeenCalledTimes(1);
    const firstTransportCall = makeFetchTransportMock.mock.calls[0];
    expect(firstTransportCall).toBeDefined();
    expect(firstTransportCall).toHaveLength(2);

    const [receivedTransportOptions, mirroredFetch] = firstTransportCall as unknown as [
      { url: string },
      typeof fetch
    ];
    expect(receivedTransportOptions).toEqual(transportOptions);
    await mirroredFetch("https://ingest.test/api/real/envelope/");

    expect(module.readSentrySmokeMirrorEntries()).toEqual([
      {
        body: undefined,
        context: "background",
        statusCode: 204,
        timestamp: expect.any(Number),
        url: "https://ingest.test/api/real/envelope/"
      }
    ]);
  });

  it("scrubs events through beforeSend and removes request payloads", async () => {
    const module = await import("./sentry");
    module.resetSentryStateForTests();

    module.initSentryForContext("popup", {
      MODE: "production",
      VITE_SENTRY_DSN: "https://public@example.ingest.sentry.io/1"
    });

    const [options] = initMock.mock.calls[0] as [Record<string, unknown>];
    const scrubbed = (options.beforeSend as (event: Record<string, unknown>) => Record<string, unknown>)({
      extra: {
        tabTitle: "Hidden title"
      },
      request: {
        url: "https://secret.test"
      },
      tags: {
        url: "https://example.com/watch?v=1#frag"
      }
    });

    expect(scrubbed).toEqual({
      extra: {
        tabTitle: "[redacted]"
      },
      tags: {
        url: "https://example.com/watch"
      }
    });
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

  it("scrubs invalid URLs and drops undefined entries from structured payloads", async () => {
    const module = await import("./sentry");

    expect(
      module.scrubSentryEvent({
        extra: {
          href: "#frag",
          pageUrl: "?watch=123#frag",
          url: "/watch?v=123#frag",
          values: [undefined, null, { tabUrl: "https://example.com/watch?v=1#frag" }]
        }
      })
    ).toEqual({
      extra: {
        href: "",
        pageUrl: "",
        url: "/watch",
        values: [null, { tabUrl: "[redacted]" }]
      }
    });
  });

  it("preserves non-url strings and strips nested request-like fields from payloads", async () => {
    const module = await import("./sentry");

    expect(
      module.scrubSentryEvent({
        extra: {
          message: "keep?this#intact",
          nested: {
            request: {
              url: "https://secret.test"
            },
            url: "https://example.com/watch?v=5#hash"
          }
        }
      })
    ).toEqual({
      extra: {
        message: "keep?this#intact",
        nested: {
          url: "https://example.com/watch"
        }
      }
    });
  });

  it("drops nested request and user payloads while scrubbing all tracked url field names", async () => {
    const module = await import("./sentry");

    expect(
      module.scrubSentryEvent({
        extra: {
          nested: {
            documentUrl: "https://example.com/watch?v=1#frag",
            frameUrl: "https://frames.example.com/player?id=9#inline",
            requestUrl: "/api/status?token=secret#frag",
            request: {
              method: "POST"
            },
            user: {
              id: "sensitive"
            }
          }
        }
      })
    ).toEqual({
      extra: {
        nested: {
          documentUrl: "https://example.com/watch",
          frameUrl: "https://frames.example.com/player",
          requestUrl: "/api/status"
        }
      }
    });
  });

  it("preserves null values, drops undefined object entries, and leaves plain invalid urls intact", async () => {
    const module = await import("./sentry");

    expect(
      module.scrubSentryEvent({
        extra: {
          emptyState: null,
          invalidUrl: "not a url",
          missing: undefined,
          nested: {
            maybeNull: null,
            maybeUndefined: undefined
          }
        }
      })
    ).toEqual({
      extra: {
        emptyState: null,
        invalidUrl: "not a url",
        nested: {
          maybeNull: null
        }
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

  it("does not attach empty extra payloads to sentry scopes", async () => {
    const module = await import("./sentry");
    module.resetSentryStateForTests();

    module.initSentryForContext("background", {
      MODE: "production",
      VITE_SENTRY_DSN: "https://public@example.ingest.sentry.io/1"
    });

    module.captureExceptionSafe(new Error("boom"), "background", {});

    const scopeCallback = withScopeMock.mock.calls.at(-1)?.[0] as (scope: ScopeStub) => void;
    const scope = createScopeStub();
    scopeCallback(scope);

    expect(scope.setExtras).not.toHaveBeenCalled();
  });

  it("normalizes unknown exceptions to a safe Error instance", async () => {
    const module = await import("./sentry");
    module.resetSentryStateForTests();

    module.initSentryForContext("background", {
      MODE: "production",
      VITE_SENTRY_DSN: "https://public@example.ingest.sentry.io/1"
    });

    module.captureExceptionSafe({ unexpected: true }, "background");

    expect(captureExceptionMock).toHaveBeenCalledTimes(1);
    expect(captureExceptionMock.mock.calls[0][0]).toBeInstanceOf(Error);
    expect((captureExceptionMock.mock.calls[0][0] as Error).message).toBe("Unknown runtime exception");
  });

  it("treats blank string exceptions as unknown runtime exceptions", async () => {
    const module = await import("./sentry");
    module.resetSentryStateForTests();

    module.initSentryForContext("background", {
      MODE: "production",
      VITE_SENTRY_DSN: "https://public@example.ingest.sentry.io/1"
    });

    module.captureExceptionSafe("   ", "background");

    expect(captureExceptionMock).toHaveBeenCalledTimes(1);
    expect((captureExceptionMock.mock.calls[0][0] as Error).message).toBe("Unknown runtime exception");
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

  it("ignores blank global error messages and captures non-empty string-only errors", async () => {
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

    listenerMap.get("error")?.({ message: "   " });
    expect(captureExceptionMock).not.toHaveBeenCalled();

    listenerMap.get("error")?.({ message: "string boom" });
    expect(captureExceptionMock).toHaveBeenCalledTimes(1);
    expect((captureExceptionMock.mock.calls[0][0] as Error).message).toBe("string boom");

    listenerMap.get("error")?.({ message: 123 });
    expect(captureExceptionMock).toHaveBeenCalledTimes(1);
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

  it("records mirrored transport failures and keeps only the latest ten entries", async () => {
    const module = await import("./sentry");
    module.resetSentryStateForTests();

    const failingFetch = vi.fn(async () => {
      throw new Error("network down");
    });
    const mirroredFailureFetch = module.createSmokeMirroredFetch(
      "background",
      failingFetch as unknown as typeof fetch
    );

    await expect(
      mirroredFailureFetch(new URL("https://ingest.test/api/fail/envelope/"), {
        body: new URLSearchParams({ key: "value" }),
        method: "POST"
      })
    ).rejects.toThrow("network down");

    expect(module.readSentrySmokeMirrorEntries()).toEqual([
      {
        body: "key=value",
        context: "background",
        timestamp: expect.any(Number),
        url: "https://ingest.test/api/fail/envelope/"
      }
    ]);

    module.resetSentrySmokeMirrorForTests();

    const successFetch = vi.fn(async () => new Response(null, { status: 202 }));
    const mirroredSuccessFetch = module.createSmokeMirroredFetch(
      "background",
      successFetch as unknown as typeof fetch
    );

    for (let index = 0; index < 12; index += 1) {
      await mirroredSuccessFetch(`https://ingest.test/api/${index}/envelope/`, {
        body: new Uint8Array([52, 53]),
        method: "POST"
      });
    }

    const entries = module.readSentrySmokeMirrorEntries();
    expect(entries).toHaveLength(10);
    expect(entries[0]).toMatchObject({
      body: "45",
      context: "background",
      statusCode: 202,
      url: "https://ingest.test/api/2/envelope/"
    });
    expect(entries.at(-1)).toMatchObject({
      url: "https://ingest.test/api/11/envelope/"
    });
  });

  it("resets the mirrored transport buffer back to an empty list", async () => {
    const module = await import("./sentry");
    module.resetSentryStateForTests();

    expect(module.readSentrySmokeMirrorEntries()).toEqual([]);

    const nativeFetch = vi.fn(async () => new Response(null, { status: 200 }));
    const mirroredFetch = module.createSmokeMirroredFetch("background", nativeFetch as unknown as typeof fetch);

    await mirroredFetch("https://ingest.test/api/1/envelope/", { method: "POST" });
    expect(module.readSentrySmokeMirrorEntries()).toHaveLength(1);

    module.resetSentrySmokeMirrorForTests();
    expect(module.readSentrySmokeMirrorEntries()).toEqual([]);
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

    module.captureExceptionSafe(new Error("boom"), "popup");
    module.captureMessageSafe("boom", "error", "popup");
    expect(withScopeMock).not.toHaveBeenCalled();
    expect(captureExceptionMock).not.toHaveBeenCalled();
    expect(captureMessageMock).not.toHaveBeenCalled();

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

  it("keeps the extension version undefined when runtime.getManifest is missing", async () => {
    const module = await import("./sentry");

    expect(
      module.resolveSentryRuntimeConfig(
        {
          MODE: "production",
          VITE_SENTRY_DSN: "https://public@example.ingest.sentry.io/1"
        },
        {} as Pick<typeof chrome.runtime, "getManifest">
      )
    ).toEqual({
      dsn: "https://public@example.ingest.sentry.io/1",
      enabled: true,
      environment: "production",
      extensionVersion: undefined,
      release: undefined
    });
  });

  it("trims runtime config values and falls back to the build mode for environment", async () => {
    const module = await import("./sentry");

    expect(
      module.resolveSentryRuntimeConfig(
        {
          MODE: "staging",
          VITE_SENTRY_DSN: " https://public@example.ingest.sentry.io/1 ",
          VITE_SENTRY_ENVIRONMENT: "   ",
          VITE_SENTRY_RELEASE: " release-789 "
        },
        undefined
      )
    ).toEqual({
      dsn: "https://public@example.ingest.sentry.io/1",
      enabled: true,
      environment: "staging",
      extensionVersion: undefined,
      release: "release-789"
    });
  });

  it("enables the smoke mirror for accepted truthy flag values", async () => {
    const module = await import("./sentry");

    expect(module.isSentrySmokeMirrorEnabled({ VITE_SENTRY_SMOKE_MIRROR: "yes" })).toBe(true);
    expect(module.isSentrySmokeMirrorEnabled({ VITE_SENTRY_SMOKE_MIRROR: "1" })).toBe(true);
    expect(module.isSentrySmokeMirrorEnabled({ VITE_SENTRY_SMOKE_MIRROR: "off" })).toBe(false);
  });

  it("mirrors Request inputs using the original request url", async () => {
    const module = await import("./sentry");
    module.resetSentryStateForTests();

    const nativeFetch = vi.fn(async () => new Response(null, { status: 201 }));
    const mirroredFetch = module.createSmokeMirroredFetch("background", nativeFetch as unknown as typeof fetch);
    const request = new Request("https://ingest.test/api/request/envelope/", { method: "POST" });

    await mirroredFetch(request);

    expect(module.readSentrySmokeMirrorEntries()).toEqual([
      {
        body: undefined,
        context: "background",
        statusCode: 201,
        timestamp: expect.any(Number),
        url: "https://ingest.test/api/request/envelope/"
      }
    ]);
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
        { name: "LinkedErrors" },
        {}
      ])
    ).toEqual([
      { name: "InboundFilters" },
      { name: "LinkedErrors" },
      {}
    ]);
  });
});
