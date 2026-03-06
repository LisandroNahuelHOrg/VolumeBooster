import {
  getBrowserLocale,
  getUiLanguage,
  formatLocalizedMessage,
  isRtlLocale,
  isPluralBaseKey,
  loadLocaleCatalog,
  setDocumentLocaleAttributes,
  t,
  tp,
  translate
} from "./runtime-i18n";

describe("runtime i18n", () => {
  it("resolves simple messages and placeholder substitutions through chrome.i18n", () => {
    const getMessage = vi.fn((name: string, substitutions?: string | string[]) => {
      if (name === "rememberSite") {
        const [domain] = Array.isArray(substitutions) ? substitutions : [substitutions];
        return `Remember ${domain}`;
      }

      return name;
    });
    const api = {
      getMessage,
      getUILanguage() {
        return "en";
      }
    };

    expect(t("rememberSite", { domain: "youtube.com" }, api)).toBe("Remember youtube.com");
    expect(t("advancedTitle", undefined, api)).toBe("advancedTitle");
    expect(getMessage).toHaveBeenNthCalledWith(1, "rememberSite", ["youtube.com"]);
    expect(getMessage).toHaveBeenNthCalledWith(2, "advancedTitle");
    expect(getMessage.mock.calls[1]).toHaveLength(1);
  });

  it("resolves plural keys with locale-aware categories and falls back to other", () => {
    const api = {
      getMessage(name: string, substitutions?: string | string[]) {
        const [count] = Array.isArray(substitutions) ? substitutions : [substitutions];
        return `${name}:${count ?? ""}`;
      },
      getUILanguage() {
        return "en";
      }
    };

    expect(tp("boostingCount", 0, undefined, api, "en")).toBe("boostingCount_zero:");
    expect(tp("boostingCount", 1, undefined, api, "en")).toBe("boostingCount_one:");
    expect(tp("boostingCount", 3, { count: 3 }, api, "es")).toBe("boostingCount_other:3");
    expect(tp("boostingCount", 2, { count: 2 }, api, "ar")).toBe("boostingCount_two:2");
  });

  it("formats localized message descriptors", () => {
    const api = {
      getMessage(name: string, substitutions?: string | string[]) {
        const [domain] = Array.isArray(substitutions) ? substitutions : [substitutions];
        return name === "forgetSite" ? `Forget ${domain}` : name;
      },
      getUILanguage() {
        return "en";
      }
    };

    vi.stubGlobal("chrome", { i18n: api } as unknown as typeof chrome);

    expect(formatLocalizedMessage({ key: "forgetSite", substitutions: { domain: "youtube.com" } })).toBe(
      "Forget youtube.com"
    );
    expect(formatLocalizedMessage()).toBe("");

    vi.unstubAllGlobals();
  });

  it("falls back to navigator or english when chrome.i18n is unavailable", async () => {
    vi.stubGlobal("navigator", { language: "es-AR" } as Navigator);

    expect(getUiLanguage(null)).toBe("es-AR");
    expect(getBrowserLocale()).toBe("es-AR");
    expect(await loadLocaleCatalog("es")).toEqual({});
    expect(translate({}, "advancedTitle")).toBe("advancedTitle");

    vi.unstubAllGlobals();
    expect(getUiLanguage(null)).toBe(navigator.language);
  });

  it("prefers chrome.i18n.getUILanguage when the api exposes it", () => {
    const getUILanguage = vi.fn(() => "fr-CA");

    vi.stubGlobal("navigator", { language: "es-AR" } as Navigator);

    expect(
      getUiLanguage({
        getMessage: vi.fn(),
        getUILanguage
      })
    ).toBe("fr-CA");
    expect(getUILanguage).toHaveBeenCalledTimes(1);
  });

  it("falls back cleanly when the api object exists but does not expose getUILanguage", () => {
    vi.stubGlobal("navigator", undefined as unknown as Navigator);

    expect(
      getUiLanguage({
        getMessage: vi.fn()
      })
    ).toBe("en");
  });

  it("falls back to english when neither chrome.i18n nor navigator.language are available", () => {
    vi.stubGlobal("navigator", {} as Navigator);

    expect(getUiLanguage(null)).toBe("en");

    vi.unstubAllGlobals();
  });

  it("returns the key when chrome.i18n cannot resolve a message and exposes plural helpers", () => {
    const getMessage = vi.fn(() => "");
    const api = {
      getMessage,
      getUILanguage() {
        return "en";
      }
    };

    expect(t("advancedTitle", undefined, api)).toBe("advancedTitle");
    expect(tp("boostingCount", 5, { count: 5 }, api, "en")).toBe("boostingCount_other");
    expect(tp("boostingCount", 0, undefined, api, "en")).toBe("boostingCount_zero");
    expect(tp("not_real_key" as never, 5, undefined, null, "xx-XX")).toBe("5");
    expect(isPluralBaseKey("boostingCount")).toBe(true);
    expect(isPluralBaseKey("not_real_key")).toBe(false);
    expect(getMessage).toHaveBeenNthCalledWith(1, "advancedTitle");
    expect(getMessage).toHaveBeenNthCalledWith(2, "boostingCount_other", ["5"]);
    expect(getMessage).toHaveBeenNthCalledWith(3, "boostingCount_zero");
  });

  it("keeps placeholder-based translations safe when substitutions are missing at runtime", () => {
    const getMessage = vi.fn(() => "");
    const api = {
      getMessage,
      getUILanguage() {
        return "en";
      }
    };

    expect(t("rememberSite", undefined as never, api)).toBe("rememberSite");
    expect(getMessage).toHaveBeenCalledTimes(1);
    expect(getMessage).toHaveBeenCalledWith("rememberSite");
  });

  it("falls back to the other plural key when the locale category is not present in the catalog", () => {
    const getMessage = vi.fn((name: string, substitutions?: string | string[]) => {
      const [count] = Array.isArray(substitutions) ? substitutions : [substitutions];
      return `${name}:${count ?? ""}`;
    });
    const api = {
      getMessage,
      getUILanguage() {
        return "en";
      }
    };

    expect(tp("boostingCount", 3, { count: 3 }, api, "en")).toBe("boostingCount_other:3");
    expect(getMessage).toHaveBeenCalledTimes(1);
    expect(getMessage).toHaveBeenCalledWith("boostingCount_other", ["3"]);
  });

  it("detects rtl locales and sets lang and dir on the document root", () => {
    expect(isRtlLocale("ar")).toBe(true);
    expect(isRtlLocale("he-IL")).toBe(true);
    expect(isRtlLocale("es-AR")).toBe(false);

    const documentElement = { lang: "", dir: "" };
    const doc = { documentElement } as unknown as Document;
    const result = setDocumentLocaleAttributes(doc, "ar");

    expect(result).toEqual({ lang: "ar", dir: "rtl" });
    expect(documentElement.lang).toBe("ar");
    expect(documentElement.dir).toBe("rtl");

    const ltrDocumentElement = { lang: "", dir: "" };
    const ltrDoc = { documentElement: ltrDocumentElement } as unknown as Document;
    expect(setDocumentLocaleAttributes(ltrDoc, "es-AR")).toEqual({ lang: "es-AR", dir: "ltr" });
  });
});
