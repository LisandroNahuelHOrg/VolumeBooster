import { getDuckDuckGoFaviconUrl } from "../../../shared/domain";
import { escapeHtml } from "../util/escape-html";
import { getSiteGlyph } from "../util/get-site-glyph";

export function renderSiteFavicon(
  label: string,
  domain?: string,
  size: "large" | "small" = "small"
): string {
  const faviconUrl = getDuckDuckGoFaviconUrl(domain);
  const sizeClass = size === "large" ? "site-favicon--large" : "site-favicon--small";
  const glyph = escapeHtml(getSiteGlyph(label, domain));

  return `
    <span
      class="site-favicon ${sizeClass}"
      data-role="site-favicon"
      ${faviconUrl ? 'data-has-image="true"' : ""}
      aria-hidden="true"
    >
      <span class="site-favicon__fallback">${glyph}</span>
      ${
        faviconUrl
          ? `<img
              class="site-favicon__image"
              data-role="site-favicon-image"
              src="${escapeHtml(faviconUrl)}"
              alt=""
              decoding="async"
              referrerpolicy="no-referrer"
            />`
          : ""
      }
    </span>
  `;
}
