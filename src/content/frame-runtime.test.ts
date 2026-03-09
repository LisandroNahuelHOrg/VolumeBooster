// @vitest-environment happy-dom

import { getCurrentFrameContext } from "./frame-runtime";

describe("getCurrentFrameContext", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it("reports the current document url for the top frame", () => {
    window.history.replaceState({}, "", "/player");

    expect(getCurrentFrameContext()).toEqual({
      isTopFrame: true,
      frameUrl: "http://localhost:3000/player"
    });
  });

  it("marks the frame as non-top when top and self differ", () => {
    Object.defineProperty(window, "top", {
      configurable: true,
      value: {}
    });

    const context = getCurrentFrameContext();

    expect(context.isTopFrame).toBe(false);
    expect(context.frameUrl).toBe("http://localhost:3000/player");
  });

  it("falls back to the document location when window.location.href is unavailable", () => {
    Object.defineProperty(window, "top", {
      configurable: true,
      value: window
    });
    Object.defineProperty(window, "location", {
      configurable: true,
      value: {}
    });
    Object.defineProperty(document, "location", {
      configurable: true,
      value: {
        href: "https://fallback.example/frame"
      }
    });

    expect(getCurrentFrameContext()).toEqual({
      isTopFrame: true,
      frameUrl: "https://fallback.example/frame"
    });
  });

  it("falls back to an empty string when both window and document urls are unavailable", () => {
    Object.defineProperty(window, "location", {
      configurable: true,
      value: {}
    });
    Object.defineProperty(document, "location", {
      configurable: true,
      value: undefined
    });

    expect(getCurrentFrameContext()).toEqual({
      isTopFrame: true,
      frameUrl: ""
    });
  });

  it("keeps working when the global document is unavailable", () => {
    Object.defineProperty(window, "location", {
      configurable: true,
      value: {}
    });
    vi.stubGlobal("document", undefined);

    expect(getCurrentFrameContext()).toEqual({
      isTopFrame: true,
      frameUrl: ""
    });
  });
});
