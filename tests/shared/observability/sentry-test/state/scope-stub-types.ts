export interface ScopeStub {
  setExtras: ReturnType<typeof vi.fn>;
  setLevel: ReturnType<typeof vi.fn>;
  setTag: ReturnType<typeof vi.fn>;
}

export interface ScopeCallback {
  (scope: ScopeStub): void;
}

export interface ListenerHandler {
  (event: unknown): void;
}

export interface EventScrubber {
  (event: Record<string, unknown>): Record<string, unknown>;
}

export interface IntegrationFilter {
  (integrations: Array<{ name: string }>): Array<{ name: string }>;
}

export interface TransportFactory {
  (options: { url: string }): unknown;
}
