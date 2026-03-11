/**
 * @fileoverview Tests the build-time Sentry helper used by Vite.
 */
import "../../../tests/shared/observability/sentry-build-test/setup/mock-sentry-vite-plugin";
import { defineSentryBuildHelperSuite } from "../../../tests/shared/observability/sentry-build-test/suite/define-sentry-build-helper.suite";

describe("sentry build helper", defineSentryBuildHelperSuite);
