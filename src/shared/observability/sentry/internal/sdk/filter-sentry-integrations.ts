import { DISABLED_SENTRY_INTEGRATION_NAMES } from "../constants";

export function filterSentryIntegrations<TIntegration extends { name?: string }>(
  integrations: TIntegration[]
): TIntegration[] {
  const filteredIntegrations: TIntegration[] = [];

  for (const integration of integrations) {
    if (!DISABLED_SENTRY_INTEGRATION_NAMES.has(integration.name ?? "")) {
      filteredIntegrations.push(integration);
    }
  }

  return filteredIntegrations;
}
