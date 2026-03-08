// @vitest-environment happy-dom

import { getCurrentFrameContext } from "./frame-runtime";

describe("getCurrentFrameContext", () => {
  afterEach(() => {
    vi.restoreAllMocks();
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
});
