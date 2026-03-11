import { runResolvesRuntimeConfigFromEnvCase } from "../callback/resolves-runtime-config-from-env.callback";

export function registerResolvesRuntimeConfigFromEnvCase(): void {
  it("resolves runtime config from env values", runResolvesRuntimeConfigFromEnvCase);
}
