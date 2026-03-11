import { runEnablesSmokeMirrorForTruthyFlagsCase } from "../callback/enables-smoke-mirror-for-truthy-flags.callback";

export function registerEnablesSmokeMirrorForTruthyFlagsCase(): void {
  it("enables the smoke mirror for accepted truthy flag values", runEnablesSmokeMirrorForTruthyFlagsCase);
}
