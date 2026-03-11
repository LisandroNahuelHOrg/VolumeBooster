import { runRuntimeEnabledWithDsnCase } from "../callback/runtime-enabled-with-dsn.callback";

export function registerRuntimeEnabledWithDsnCase(): void {
  it("enables runtime only when a DSN exists", runRuntimeEnabledWithDsnCase);
}
