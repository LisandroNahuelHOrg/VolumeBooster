import { renderPopupToolbar } from "./render-popup-toolbar";

describe("render-popup-toolbar", () => {
  it("renders a visible premium cta while keeping the other toolbar actions icon-only", () => {
    const markup = renderPopupToolbar("dark", "main", {} as never);

    expect(markup).toContain('data-popup-toolbar="premium-mock"');
    expect(markup).toContain('<span class="popup-toolbar__text">Get Premium</span>');
    expect(markup).toContain('title="Premium is coming soon."');
    expect(markup).toContain('data-popup-toolbar="toggle-popup-theme"');
    expect(markup).toContain('data-popup-toolbar="open-popup-settings"');
    expect(markup.match(/popup-toolbar__text/g)).toHaveLength(1);
  });
});
