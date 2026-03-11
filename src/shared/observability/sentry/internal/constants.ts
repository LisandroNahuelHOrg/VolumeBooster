export const REDACTED_VALUE = "[redacted]";
export const SENTRY_SMOKE_MIRROR_LIMIT = 10;

export const DISABLED_SENTRY_INTEGRATION_NAMES = new Set([
  "Breadcrumbs",
  "BrowserApiErrors",
  "BrowserSession",
  "ConversationId",
  "CultureContext",
  "GlobalHandlers",
  "HttpContext"
]);

export const SENSITIVE_FIELD_NAMES = new Set(["taburl", "tabtitle", "faviconurl"]);
export const URL_FIELD_NAMES = new Set(["documenturl", "frameurl", "href", "pageurl", "requesturl", "url"]);
export const DROPPED_FIELD_NAMES = new Set(["request", "user"]);
