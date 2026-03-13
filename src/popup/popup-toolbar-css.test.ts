import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

describe("popup toolbar css", () => {
  const facade = readFileSync(fileURLToPath(new URL("./popup-toolbar.css", import.meta.url)), "utf8");
  const structure = readFileSync(
    fileURLToPath(new URL("./internal/popup-toolbar-structure.css", import.meta.url)),
    "utf8"
  );
  const state = readFileSync(fileURLToPath(new URL("./internal/popup-toolbar-state.css", import.meta.url)), "utf8");
  const main = readFileSync(fileURLToPath(new URL("./main.ts", import.meta.url)), "utf8");

  it("keeps the toolbar stylesheet split through a small facade", () => {
    expect(facade).toContain('@import "./internal/popup-toolbar-structure.css";');
    expect(facade).toContain('@import "./internal/popup-toolbar-state.css";');
    expect(main).toContain('import "./popup-toolbar.css";');
  });

  it("expands only the premium button and renders a dedicated text style", () => {
    expect(structure).toContain('.popup-toolbar__button[data-popup-toolbar="premium-mock"]');
    expect(structure).toContain("width: auto;");
    expect(structure).toContain("padding: 0 14px;");
    expect(structure).toContain(".popup-toolbar__text");
    expect(structure).toContain("white-space: nowrap;");
  });

  it("preserves the premium and settings visual states after the split", () => {
    expect(state).toContain("color: var(--toolbar-premium-icon);");
    expect(state).toContain("background: var(--toolbar-premium-bg);");
    expect(state).toContain(".popup-toolbar__button[data-popup-toolbar=\"open-popup-settings\"].is-active");
    expect(state).toContain("border-color: var(--toolbar-settings-active-ring);");
    expect(state).toContain("@keyframes popup-premium-glaze");
  });
});
