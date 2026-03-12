/**
 * @fileoverview Sanitizes persisted domain gain overrides into a numeric map.
 * @module shared/storage/sanitize-domain-gains
 */

import { clampGainPercent } from "../gain";

export function sanitizeDomainGains(domainGains: unknown): Record<string, number> {
  if (!domainGains || typeof domainGains !== "object") {
    return {};
  }

  const sanitized: Record<string, number> = {};

  for (const [domain, value] of Object.entries(domainGains)) {
    if (typeof value === "number" && Number.isFinite(value)) {
      sanitized[domain] = clampGainPercent(value);
    }
  }

  return sanitized;
}
