/**
 * @fileoverview Tests the shared Sentry runtime wrapper and privacy scrubber.
 */
import "../../../tests/shared/observability/sentry-test/setup/mock-browser-sentry";
import { defineSharedSentryWrapperSuite } from "../../../tests/shared/observability/sentry-test/suite/define-shared-sentry-wrapper.suite";

describe("shared observability sentry wrapper", defineSharedSentryWrapperSuite);
