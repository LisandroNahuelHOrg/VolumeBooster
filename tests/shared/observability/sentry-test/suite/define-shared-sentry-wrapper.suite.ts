import { resetRuntimeSentrySuite } from "../callback/reset-runtime-sentry-suite.callback";
import { defineBootAndInitSuite } from "./boot-and-init.suite";
import { defineEventTargetAndListenersSuite } from "./event-target-and-listeners.suite";
import { definePrivacyScrubberSuite } from "./privacy-scrubber.suite";
import { defineCaptureSafetySuite } from "./capture-safety.suite";
import { defineSmokeMirrorSuite } from "./smoke-mirror.suite";
import { defineRuntimeConfigAndFlagsSuite } from "./runtime-config-and-flags.suite";
import { defineIntegrationFilteringSuite } from "./integration-filtering.suite";

export function defineSharedSentryWrapperSuite(): void {
  beforeEach(resetRuntimeSentrySuite);
  defineBootAndInitSuite();
  defineEventTargetAndListenersSuite();
  definePrivacyScrubberSuite();
  defineCaptureSafetySuite();
  defineSmokeMirrorSuite();
  defineRuntimeConfigAndFlagsSuite();
  defineIntegrationFilteringSuite();
}
