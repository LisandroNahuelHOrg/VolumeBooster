import { buildTabSummary, getDomainFromUrl, getDuckDuckGoFaviconUrl, isSupportedTabUrl } from "./domain";

describe("domain helpers", () => {
  it("extracts normalized domains from capturable URLs", () => {
    expect(getDomainFromUrl("https://www.YouTube.com/watch?v=1")).toBe("youtube.com");
    expect(getDomainFromUrl("https://video.www.youtube.com/watch?v=1")).toBe("video.www.youtube.com");
    expect(getDomainFromUrl("chrome://extensions")).toBeUndefined();
    expect(getDomainFromUrl(undefined)).toBeUndefined();
    expect(getDomainFromUrl("not a url")).toBeUndefined();
  });

  it("returns early without touching URL parsing when the input is empty", () => {
    const originalUrl = globalThis.URL;
    const urlSpy = vi.fn((input: string | URL, base?: string | URL) => new originalUrl(input, base));

    vi.stubGlobal("URL", urlSpy as unknown as typeof URL);

    expect(getDomainFromUrl(undefined)).toBeUndefined();
    expect(getDomainFromUrl(null)).toBeUndefined();
    expect(getDomainFromUrl("")).toBeUndefined();
    expect(urlSpy).not.toHaveBeenCalled();

    vi.unstubAllGlobals();
  });

  it("swallows URL constructor failures and returns undefined", () => {
    const constructorFailure = new TypeError("bad url");
    const brokenUrl = vi.fn(function brokenUrlConstructor() {
      throw constructorFailure;
    });

    vi.stubGlobal("URL", brokenUrl as unknown as typeof URL);

    expect(getDomainFromUrl("https://youtube.com")).toBeUndefined();
    expect(brokenUrl).toHaveBeenCalledOnce();

    vi.unstubAllGlobals();
  });

  it("marks supported urls correctly", () => {
    expect(isSupportedTabUrl("https://twitch.tv")).toBe(true);
    expect(isSupportedTabUrl("chrome://settings")).toBe(false);
  });

  it("builds a DuckDuckGo favicon URL from the normalized domain", () => {
    expect(getDuckDuckGoFaviconUrl("WWW.YouTube.com")).toBe(
      "https://icons.duckduckgo.com/ip3/youtube.com.ico"
    );
    expect(getDuckDuckGoFaviconUrl("Video.WWW.YouTube.com")).toBe(
      "https://icons.duckduckgo.com/ip3/video.www.youtube.com.ico"
    );
    expect(getDuckDuckGoFaviconUrl("   ")).toBeUndefined();
    expect(getDuckDuckGoFaviconUrl()).toBeUndefined();
  });

  it("builds tab summaries with defaults", () => {
    const summary = buildTabSummary(
      {
        id: 11,
        title: "Video",
        url: "https://www.example.com/video",
        favIconUrl: "https://www.example.com/icon.ico"
      } as chrome.tabs.Tab,
      220,
      true
    );

    expect(summary).toMatchObject({
      tabId: 11,
      title: "Video",
      domain: "example.com",
      supported: true,
      preferredGainPercent: 220,
      hasStoredPreference: true
    });
  });

  it("builds unsupported tab summaries using pending urls when the title is missing", () => {
    const summary = buildTabSummary({
      pendingUrl: "chrome://extensions",
      url: "chrome://extensions"
    } as chrome.tabs.Tab);

    expect(summary).toMatchObject({
      tabId: -1,
      title: "chrome://extensions",
      supported: false,
      preferredGainPercent: 100,
      hasStoredPreference: false,
      autoAttachState: "idle"
    });
  });

  it("falls back to an empty title when the tab exposes no title or url fields", () => {
    const summary = buildTabSummary({ id: 7 } as chrome.tabs.Tab);

    expect(summary).toMatchObject({
      tabId: 7,
      title: "",
      url: undefined,
      domain: undefined,
      supported: false,
      preferredGainPercent: 100,
      hasStoredPreference: false,
      autoAttachState: "idle"
    });
  });
});
