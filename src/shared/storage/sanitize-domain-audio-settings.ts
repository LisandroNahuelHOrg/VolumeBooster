import { sanitizeAdvancedAudioSettings } from "../audio-settings";
import type { AdvancedAudioSettings } from "../types";

export function sanitizeDomainAudioSettings(domainAudioSettings: unknown): Record<string, AdvancedAudioSettings> {
  if (!domainAudioSettings || typeof domainAudioSettings !== "object") {
    return {};
  }

  const sanitized: Record<string, AdvancedAudioSettings> = {};

  for (const [domain, settings] of Object.entries(domainAudioSettings)) {
    sanitized[domain] = sanitizeAdvancedAudioSettings(settings as Partial<AdvancedAudioSettings>);
  }

  return sanitized;
}
