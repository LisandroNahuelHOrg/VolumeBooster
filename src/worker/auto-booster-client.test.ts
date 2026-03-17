import { registerConfigureAndDisableTests } from "./auto-booster-client/tests/configure-and-disable.suite";
import { registerDebugAndFrameTargetingTests } from "./auto-booster-client/tests/debug-and-frame-targeting.suite";
import { registerPermissionRecoveryIdempotencyTests } from "./auto-booster-client/tests/permission-recovery-idempotency.suite";
import { registerPermissionsAndQueryTests } from "./auto-booster-client/tests/permissions-and-query.suite";
import { registerRegistrationAndRetryTests } from "./auto-booster-client/tests/registration-and-retry.suite";

registerConfigureAndDisableTests();
registerDebugAndFrameTargetingTests();
registerPermissionRecoveryIdempotencyTests();
registerPermissionsAndQueryTests();
registerRegistrationAndRetryTests();
