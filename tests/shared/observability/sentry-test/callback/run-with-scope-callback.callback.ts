import type { ScopeCallback } from "../state/scope-stub-types";
import { createScopeStub } from "./create-scope-stub.callback";

export function runWithScopeCallback(callback: ScopeCallback): void {
  callback(createScopeStub());
}
