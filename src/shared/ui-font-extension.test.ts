// @vitest-environment happy-dom

import { ensureExtensionUiFontFaces } from "./ui-font-extension";
import { UI_FONT_STACK, UI_FONT_STYLE_ID } from "./ui-font-stack";

describe("ui-font-extension", () => {
  beforeEach(() => {
    document.head.innerHTML = "";
    document.body.innerHTML = "";
  });

  it("injects the packaged Montserrat font faces only once per extension document", () => {
    ensureExtensionUiFontFaces(document);
    ensureExtensionUiFontFaces(document);

    const styleElement = document.getElementById(UI_FONT_STYLE_ID);

    expect(styleElement).not.toBeNull();
    expect(document.querySelectorAll(`#${UI_FONT_STYLE_ID}`)).toHaveLength(1);
    expect(styleElement?.textContent?.startsWith("@font-face")).toBe(true);
    expect(styleElement?.textContent).toContain('font-family: "Montserrat"');
    expect(styleElement?.textContent?.match(/font-family: "Montserrat"/g)).toHaveLength(5);
    expect(styleElement?.textContent).toContain("montserrat-latin");
  });

  it("exports the shared font stack used by inline UI surfaces", () => {
    expect(UI_FONT_STACK).toContain("Montserrat");
    expect(UI_FONT_STACK).toContain("Segoe UI");
  });

  it("falls back to documentElement when an extension document has no head", () => {
    const appendChild = vi.fn();
    const styleElement = { id: "", textContent: "" } as unknown as HTMLStyleElement;
    const targetDocument = {
      createElement: vi.fn(() => styleElement),
      documentElement: { appendChild },
      getElementById: vi.fn(() => null),
      head: undefined
    } as unknown as Document;

    ensureExtensionUiFontFaces(targetDocument);

    expect(appendChild).toHaveBeenCalledWith(styleElement);
    expect(styleElement.textContent?.startsWith("@font-face")).toBe(true);
  });
});
