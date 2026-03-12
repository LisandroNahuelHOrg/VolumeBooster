import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { renderSessionBoostActionBar } from "./render-session-boost-action-bar";

describe("renderSessionBoostActionBar", () => {
  const main = readFileSync(fileURLToPath(new URL("./main.ts", import.meta.url)), "utf8");
  const css = readFileSync(fileURLToPath(new URL("./popup-session-boost-bar.css", import.meta.url)), "utf8");

  it("renders a visible 2x2 action grid plus the full-width dismiss button", () => {
    const markup = renderSessionBoostActionBar({
      visible: true,
      siteApplyLabel: "Apply this settings only on this site",
      allSitesApplyLabel: "Apply this settings on all sites",
      siteResetLabel: "Reset defaults on this site",
      allSitesResetLabel: "Reset defaults on all sites",
      dismissLabel: "No guardar configuraciones",
      siteIconMarkup: "<span>site</span>",
      allSitesIconMarkup: "<span>all</span>"
    });
    const hiddenMarkup = renderSessionBoostActionBar({
      visible: false,
      siteApplyLabel: "Apply this settings only on this site",
      allSitesApplyLabel: "Apply this settings on all sites",
      siteResetLabel: "Reset defaults on this site",
      allSitesResetLabel: "Reset defaults on all sites",
      dismissLabel: "No guardar configuraciones",
      siteIconMarkup: "<span>site</span>",
      allSitesIconMarkup: "<span>all</span>"
    });

    expect(markup).toContain("session-boost-bar is-visible");
    expect(markup).toContain('aria-hidden="false"');
    expect(markup).toContain("data-action=\"apply-session-boost-to-site\"");
    expect(markup).toContain("data-action=\"apply-session-boost-to-all-sites\"");
    expect(markup).toContain("data-action=\"reset-session-boost-on-site\"");
    expect(markup).toContain("data-action=\"reset-session-boost-on-all-sites\"");
    expect(markup).toContain("data-action=\"dismiss-session-boost-prompt\"");
    expect(hiddenMarkup).toContain('aria-hidden="true"');
    expect(hiddenMarkup).toContain(" inert");
    expect(hiddenMarkup).toContain("session-boost-bar__panel");
    expect(hiddenMarkup).not.toContain("session-boost-bar is-visible");
    expect(markup).toContain("session-boost-bar__grid");
    expect(main).toContain('import "./popup-session-boost-bar.css";');
    expect(css).toContain("var(--panel-bg)");
    expect(css).toContain("var(--text)");
    expect(css).toContain("min-height: 32px");
    expect(css).toContain("padding: 6px 8px");
    expect(css).toContain("padding: 6px;");
    expect(css).toContain("gap: 4px");
    expect(css).toContain("font-size: 0.64rem");
    expect(css).toContain("width: 20px");
    expect(css).toContain("height: 20px");
    expect(css).toContain(".session-boost-bar__button.is-acknowledged");
    expect(css).toContain("var(--premium-gold-glow)");
    expect(css).not.toContain("var(--card-bg)");
    expect(css).not.toContain("var(--text-primary)");
  });
});
