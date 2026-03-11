import { runTrimsRuntimeConfigValuesAndFallsBackToModeCase } from "../callback/trims-runtime-config-values-and-falls-back-to-mode.callback";

export function registerTrimsRuntimeConfigValuesAndFallsBackToModeCase(): void {
  it("trims runtime config values and falls back to the build mode for environment", runTrimsRuntimeConfigValuesAndFallsBackToModeCase);
}
