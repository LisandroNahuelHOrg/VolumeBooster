export function createFetchTransportResult() {
  return {
    flush: vi.fn().mockResolvedValue(true),
    send: vi.fn()
  };
}
