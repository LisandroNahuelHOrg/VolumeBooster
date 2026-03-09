/**
 * @fileoverview Registered main-world entrypoint used by the global automatic
 * bridge bundle.
 *
 * Contract for future agents:
 * This file must stay side-effect-only. Do not convert it into a helper
 * module, do not re-export from `main-world`, and do not add runtime logic
 * here. The `All Sites / All Tabs` lane depends on this exact bootstrap shape.
 */
import "./main-world";
