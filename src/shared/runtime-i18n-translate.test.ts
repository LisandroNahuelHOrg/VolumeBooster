/**
 * @fileoverview Covers the translate wrapper with placeholder substitutions.
 * @module shared/runtime-i18n-translate.test
 */

import { translate } from "./runtime-i18n";

describe("runtime i18n translate wrapper", () => {
  it("passes substitutions through the wrapper when resolving catalog calls", () => {
    const api = {
      getMessage(name: string, substitutions?: string | string[]) {
        const [domain] = Array.isArray(substitutions) ? substitutions : [substitutions];
        return name === "rememberSite" ? `Remember ${domain}` : name;
      },
      getUILanguage() {
        return "en";
      }
    };

    vi.stubGlobal("chrome", { i18n: api } as unknown as typeof chrome);

    expect(translate({}, "rememberSite", { domain: "youtube.com" })).toBe("Remember youtube.com");

    vi.unstubAllGlobals();
  });
});
