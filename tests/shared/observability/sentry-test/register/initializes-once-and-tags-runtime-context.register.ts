import { runInitializesOnceAndTagsRuntimeContextCase } from "../callback/initializes-once-and-tags-runtime-context.callback";

export function registerInitializesOnceAndTagsRuntimeContextCase(): void {
  it("initializes once and tags the runtime context", runInitializesOnceAndTagsRuntimeContextCase);
}
