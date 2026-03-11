// @vitest-environment happy-dom

import { localizeFallbackToastMessage } from "./localize-fallback-toast-message";

describe("localizeFallbackToastMessage", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("uses the safe runtime i18n fallback and preserves the current substitution array shape", () => {
    const getMessage = vi
      .fn()
      .mockReturnValueOnce("")
      .mockImplementationOnce(() => {
        throw new Error("stale context");
      })
      .mockImplementation((key: string, substitutions?: string[]) => {
        if (key === "errorAutoNamed" && substitutions) {
          return substitutions.join(" :: ");
        }

        return "";
      });

    vi.stubGlobal(
      "chrome",
      {
        i18n: {
          getMessage
        }
      } as unknown as typeof chrome
    );

    expect(localizeFallbackToastMessage({ key: "errorAutoAttachFailed" })).toBe(
      "The automatic site booster could not hook this page."
    );
    expect(localizeFallbackToastMessage({ key: "errorAutoAttachFailed" })).toBe(
      "The automatic site booster could not hook this page."
    );
    expect(
      localizeFallbackToastMessage({
        key: "errorAutoNamed",
        substitutions: {
          site: "YouTube",
          lane: "manual"
        }
      } as never)
    ).toBe("YouTube :: manual");
    expect(getMessage).toHaveBeenLastCalledWith("errorAutoNamed", ["YouTube", "manual"]);
  });
});
