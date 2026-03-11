import { runBootstrapFreshImportCase } from "../callback/bootstrap-fresh-import.callback";

export function registerBootstrapFreshImportCase(): void {
  it("bootstraps Sentry on a fresh module import without requiring an explicit reset", runBootstrapFreshImportCase);
}
