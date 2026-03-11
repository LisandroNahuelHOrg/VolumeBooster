import type { ScopeStub } from "../state/scope-stub-types";

export function createScopeStub(): ScopeStub {
  return {
    setExtras: vi.fn(),
    setLevel: vi.fn(),
    setTag: vi.fn()
  };
}
