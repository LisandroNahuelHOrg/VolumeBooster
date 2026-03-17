import { renderPopupToolbar } from "./render-popup-toolbar";

describe("render-popup-toolbar", () => {
  it("renders a visible premium cta while keeping the other toolbar actions icon-only", () => {
    const markup = renderPopupToolbar("dark", "main", {} as never);

    expect(markup).toContain('data-popup-toolbar="open-popup-premium"');
    expect(markup).toContain('<span class="popup-toolbar__text">Get Premium</span>');
    expect(markup).toContain('title="Activate or manage your lifetime premium license."');
    expect(markup).toContain('data-popup-toolbar="toggle-popup-theme"');
    expect(markup).toContain('data-popup-toolbar="open-popup-settings"');
    expect(markup.match(/popup-toolbar__text/g)).toHaveLength(1);
  });

  it("renders the activated premium label when lifetime premium is active", () => {
    const markup = renderPopupToolbar("dark", "main", {} as never, true);

    expect(markup).toContain('<span class="popup-toolbar__text">Premium Activated</span>');
  });
});
