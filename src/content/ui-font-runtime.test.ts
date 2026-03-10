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
    expect(styleElement?.textContent?.startsWith("@font-face")).toBe(true);
    expect(styleElement?.textContent).toContain("chrome-extension://id/assets/montserrat-latin.woff2");
    expect(styleElement?.textContent?.match(/font-family: "Montserrat"/g)).toHaveLength(5);
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

  it.each([
    "montserrat-cyrillic-ext.woff2",
    "montserrat-cyrillic.woff2",
    "montserrat-vietnamese.woff2",
    "montserrat-latin-ext.woff2",
    "montserrat-latin.woff2"
  ])("fails open when the required asset %s is missing", (missingAssetName) => {
    vi.stubGlobal(
      "chrome",
      {
        runtime: {
          getURL: vi.fn((path: string) => (path.endsWith(missingAssetName) ? "" : `chrome-extension://id/${path}`))
        }
      } as unknown as typeof chrome
    );

    ensureContentUiFontFaces(document);

    expect(document.getElementById(UI_FONT_STYLE_ID)).toBeNull();
  });

  it("does not inject duplicate runtime font styles", () => {
    vi.stubGlobal(
      "chrome",
      {
        runtime: {
          getURL: vi.fn((path: string) => `chrome-extension://id/${path}`)
        }
      } as unknown as typeof chrome
    );

    ensureContentUiFontFaces(document);
    ensureContentUiFontFaces(document);

    expect(document.querySelectorAll(`#${UI_FONT_STYLE_ID}`)).toHaveLength(1);
  });

  it("short-circuits when the style element already exists", () => {
    const existingStyle = document.createElement("style");
    existingStyle.id = UI_FONT_STYLE_ID;
    document.head.appendChild(existingStyle);

    vi.stubGlobal(
      "chrome",
      {
        runtime: {
          getURL: vi.fn((path: string) => `chrome-extension://id/${path}`)
        }
      } as unknown as typeof chrome
    );

    ensureContentUiFontFaces(document);

    expect(document.querySelectorAll(`#${UI_FONT_STYLE_ID}`)).toHaveLength(1);
    expect(document.getElementById(UI_FONT_STYLE_ID)).toBe(existingStyle);
  });

  it("falls back to documentElement when the target document has no head", () => {
    const appendChild = vi.fn();
    const styleElement = { id: "", textContent: "" } as unknown as HTMLStyleElement;
    const targetDocument = {
      createElement: vi.fn(() => styleElement),
      documentElement: { appendChild },
      getElementById: vi.fn(() => null),
      head: undefined
    } as unknown as Document;

    vi.stubGlobal(
      "chrome",
      {
        runtime: {
          getURL: vi.fn((path: string) => `chrome-extension://id/${path}`)
        }
      } as unknown as typeof chrome
    );

    ensureContentUiFontFaces(targetDocument);

    expect(appendChild).toHaveBeenCalledWith(styleElement);
    expect(styleElement.textContent?.startsWith("@font-face")).toBe(true);
  });
});
