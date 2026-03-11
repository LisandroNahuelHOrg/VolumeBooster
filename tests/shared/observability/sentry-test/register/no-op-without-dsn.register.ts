import { runNoOpWithoutDsnCase } from "../callback/no-op-without-dsn.callback";

export function registerNoOpWithoutDsnCase(): void {
  it("is a no-op when no DSN is configured", runNoOpWithoutDsnCase);
}
