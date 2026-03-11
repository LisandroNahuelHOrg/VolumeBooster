import { runPassesHardenedPluginOptionsCase } from "../callback/passes-hardened-plugin-options.callback";

export function registerPassesHardenedPluginOptionsCase(): void {
  it("passes the hardened plugin options and warning handler through to Sentry", runPassesHardenedPluginOptionsCase);
}
