import { runMirrorsTransportEnvelopesWhenSmokeEnabledCase } from "../callback/mirrors-transport-envelopes-when-smoke-enabled.callback";

export function registerMirrorsTransportEnvelopesWhenSmokeEnabledCase(): void {
  it("mirrors transport envelopes only when the smoke flag is enabled", runMirrorsTransportEnvelopesWhenSmokeEnabledCase);
}
