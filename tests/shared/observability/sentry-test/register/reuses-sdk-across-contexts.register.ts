import { runReusesSdkAcrossContextsCase } from "../callback/reuses-sdk-across-contexts.callback";

export function registerReusesSdkAcrossContextsCase(): void {
  it("reuses the initialized sdk for a second runtime context without reinitializing", runReusesSdkAcrossContextsCase);
}
