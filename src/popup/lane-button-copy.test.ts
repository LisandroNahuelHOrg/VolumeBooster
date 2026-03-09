import { getLaneButtonCopy } from "./lane-button-copy";

describe("lane-button-copy", () => {
  beforeEach(() => {
    const messages: Record<string, string> = {
      laneActionActivate: "Activate",
      laneActionDeactivate: "Deactivate",
      laneMode1Label: "Manual Mode: Boost Current Tab",
      laneMode2Label: "Auto Mode: Auto-Boost All Sites and Tabs"
    };

    vi.stubGlobal("chrome", {
      i18n: {
        getMessage: (key: string) => messages[key] ?? key,
        getUILanguage: () => "en"
      }
    } as unknown as typeof chrome);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("keeps the current-tab CTA fixed to Mode 1 while only the action line changes", () => {
    const catalog = {} as never;

    expect(getLaneButtonCopy("current-tab", false, catalog)).toEqual({
      action: "Activate",
      mode: "Manual Mode: Boost Current Tab"
    });
    expect(getLaneButtonCopy("current-tab", true, catalog)).toEqual({
      action: "Deactivate",
      mode: "Manual Mode: Boost Current Tab"
    });
  });

  it("keeps the global CTA fixed to Mode 2 while only the action line changes", () => {
    const catalog = {} as never;

    expect(getLaneButtonCopy("all-sites", false, catalog)).toEqual({
      action: "Activate",
      mode: "Auto Mode: Auto-Boost All Sites and Tabs"
    });
    expect(getLaneButtonCopy("all-sites", true, catalog)).toEqual({
      action: "Deactivate",
      mode: "Auto Mode: Auto-Boost All Sites and Tabs"
    });
  });
});
