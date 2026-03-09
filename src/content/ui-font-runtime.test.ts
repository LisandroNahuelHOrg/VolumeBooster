// @vitest-environment happy-dom

import { UI_FONT_STYLE_ID } from "../shared/ui-font-stack";
import { ensureContentUiFontFaces } from "./ui-font-runtime";

describe("ui-font-runtime", () => {
  afterEach(() => {
    document.head.innerHTML = "";
    document.body.innerHTML = "";
    vi.unstubAllGlobals();
  });

  it("injects runtime-backed font faces when extension asset URLs are available", () => {
    vi.stubGlobal(
      "chrome",
      {
        runtime: {
          getURL: vi.fn((path: string) => `chrome-extension://id/${path}`)
        }
      } as unknown as typeof chrome
    );

    ensureContentUiFontFaces(document);

    const styleElement = document.getElementById(UI_FONT_STYLE_ID);
    expect(styleElement).not.toBeNull();
    expect(styleElement?.textContent).toContain("chrome-extension://id/assets/montserrat-latin.woff2");
  });

  it("fails open when runtime URLs are unavailable", () => {
    vi.stubGlobal(
      "chrome",
      {
        runtime: {
          getURL: vi.fn(() => {
            throw new Error("stale context");
          })
        }
      } as unknown as typeof chrome
    );

    ensureContentUiFontFaces(document);

    expect(document.getElementById(UI_FONT_STYLE_ID)).toBeNull();
  });
});
