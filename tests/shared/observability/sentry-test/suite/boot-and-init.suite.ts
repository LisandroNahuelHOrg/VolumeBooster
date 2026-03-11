import { registerNoOpWithoutDsnCase } from "../register/no-op-without-dsn.register";
import { registerCaptureInertBeforeInitCase } from "../register/capture-inert-before-init.register";
import { registerBootstrapFreshImportCase } from "../register/bootstrap-fresh-import.register";
import { registerInitializesOnceAndTagsRuntimeContextCase } from "../register/initializes-once-and-tags-runtime-context.register";
import { registerReusesSdkAcrossContextsCase } from "../register/reuses-sdk-across-contexts.register";
import { registerOmitsOptionalReleaseTagsCase } from "../register/omits-optional-release-tags.register";

export function defineBootAndInitSuite(): void {
  registerNoOpWithoutDsnCase();
  registerCaptureInertBeforeInitCase();
  registerBootstrapFreshImportCase();
  registerInitializesOnceAndTagsRuntimeContextCase();
  registerReusesSdkAcrossContextsCase();
  registerOmitsOptionalReleaseTagsCase();
}
