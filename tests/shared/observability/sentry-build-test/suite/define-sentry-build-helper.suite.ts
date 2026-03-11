import { resetSentryBuildSuite } from "../callback/reset-sentry-build-suite.callback";
import { definePluginCreationSuite } from "./plugin-creation.suite";
import { definePluginHardeningSuite } from "./plugin-hardening.suite";
import { definePluginIncompleteMatrixSuite } from "./plugin-incomplete-matrix.suite";
import { defineRuntimeEnablementSuite } from "./runtime-enablement.suite";
import { defineSourcemapModeSuite } from "./sourcemap-mode.suite";
import { defineUploadGatingSuite } from "./upload-gating.suite";

export function defineSentryBuildHelperSuite(): void {
  beforeEach(resetSentryBuildSuite);
  defineRuntimeEnablementSuite();
  defineUploadGatingSuite();
  defineSourcemapModeSuite();
  definePluginCreationSuite();
  definePluginIncompleteMatrixSuite();
  definePluginHardeningSuite();
}
