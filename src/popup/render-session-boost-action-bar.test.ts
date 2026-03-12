import { renderSessionBoostActionBar } from "./render-session-boost-action-bar";

describe("renderSessionBoostActionBar", () => {
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

    expect(markup).toContain("session-boost-bar is-visible");
    expect(markup).toContain("data-action=\"apply-session-boost-to-site\"");
    expect(markup).toContain("data-action=\"apply-session-boost-to-all-sites\"");
    expect(markup).toContain("data-action=\"reset-session-boost-on-site\"");
    expect(markup).toContain("data-action=\"reset-session-boost-on-all-sites\"");
    expect(markup).toContain("data-action=\"dismiss-session-boost-prompt\"");
    expect(markup).toContain("session-boost-bar__grid");
  });
});
