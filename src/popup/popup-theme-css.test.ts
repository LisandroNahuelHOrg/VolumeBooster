import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

function extractRule(source: string, selector: string): string {
  const escapedSelector = selector.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const match = source.match(new RegExp(`${escapedSelector}\\s*\\{([\\s\\S]*?)\\n\\}`, "m"));

  if (!match) {
    throw new Error(`Expected to find CSS rule for ${selector}.`);
  }

  return match[1];
}

describe("popup theme css", () => {
  const source = readFileSync(fileURLToPath(new URL("./popup.css", import.meta.url)), "utf8");

  it("keeps the premium light palette anchored to the agreed ivory and champagne base", () => {
    expect(source).toContain("--bg-top: #f7f1e4;");
    expect(source).toContain("--bg-bottom: #e8d8bc;");
    expect(source).toContain("--surface: rgba(248, 241, 229, 0.92);");
    expect(source).toContain("--text: #2d2217;");
    expect(source).toContain("--muted: #67553f;");
    expect(source).toContain("--accent: #c9862c;");
    expect(source).toContain("--success: #2d8a78;");
    expect(source).toContain("--danger: #9a3944;");
  });

  it("routes quality, advanced and session cards through semantic tokens instead of embedded fills", () => {
    const qualityRule = extractRule(source, ".quality-protector");
    const advancedRule = extractRule(source, ".advanced-settings");
    const sessionRule = extractRule(source, ".session-card");

    expect(qualityRule).toContain("border: 1px solid var(--quality-card-border);");
    expect(qualityRule).toContain("background: var(--quality-card-bg);");
    expect(qualityRule).not.toContain("rgba(255, 102, 102, 0.2)");

    expect(advancedRule).toContain("border: 1px solid var(--advanced-card-border);");
    expect(advancedRule).toContain("background: var(--advanced-card-bg);");
    expect(advancedRule).not.toContain("rgba(255, 210, 130, 0.2)");

    expect(sessionRule).toContain("border: 1px solid var(--session-card-border);");
    expect(sessionRule).toContain("background: var(--session-card-bg);");
    expect(sessionRule).not.toContain("rgba(255, 255, 255, 0.08)");
  });

  it("keeps light theme active states localized to amber and teal emphasis", () => {
    expect(source).toContain(":root[data-popup-theme=\"light\"] .ghost-button--lane.is-active");
    expect(source).toContain("rgba(201, 134, 44, 0.38)");
    expect(source).toContain(":root[data-popup-theme=\"light\"] .ghost-button--protector[data-quality-protector]:not([data-quality-protector=\"off\"]).is-active");
    expect(source).toContain("rgba(45, 138, 120, 0.34)");
    expect(source).toContain(":root[data-popup-theme=\"light\"] .ghost-button--protector[data-quality-protector=\"off\"].is-active");
    expect(source).toContain("rgba(154, 57, 68, 0.38)");
  });

  it("gives the light toolbar its own shell, premium, theme, and settings tokens", () => {
    const toolbarBarRule = extractRule(source, ".popup-toolbar__bar");
    const toolbarButtonRule = extractRule(source, ".popup-toolbar__button");
    const premiumRule = extractRule(source, ".popup-toolbar__button[data-popup-toolbar=\"premium-mock\"]");
    const themeRule = extractRule(
      source,
      ":root[data-popup-theme=\"light\"] .popup-toolbar__button[data-popup-toolbar=\"toggle-popup-theme\"]"
    );
    const settingsActiveRule = extractRule(
      source,
      ".popup-toolbar__button[data-popup-toolbar=\"open-popup-settings\"].is-active"
    );

    expect(source).toContain("--toolbar-shell-border:");
    expect(source).toContain("--toolbar-shell-bg:");
    expect(source).toContain("--toolbar-theme-chip-bg:");
    expect(source).toContain("--toolbar-settings-active-ring:");

    expect(toolbarBarRule).toContain("border: 1px solid var(--toolbar-shell-border);");
    expect(toolbarBarRule).toContain("background: var(--toolbar-shell-bg);");
    expect(toolbarButtonRule).toContain("background: var(--toolbar-button-surface);");
    expect(toolbarButtonRule).toContain("color: var(--toolbar-icon-color);");

    expect(premiumRule).toContain("color: var(--toolbar-premium-icon);");
    expect(premiumRule).toContain("background: var(--toolbar-premium-bg);");
    expect(themeRule).toContain("color: var(--toolbar-theme-icon);");
    expect(themeRule).not.toContain("#000");
    expect(settingsActiveRule).toContain("border-color: var(--toolbar-settings-active-ring);");
    expect(settingsActiveRule).toContain("background: var(--toolbar-settings-active-bg);");
    expect(settingsActiveRule).toContain("box-shadow: var(--toolbar-settings-active-shadow);");
  });
});
