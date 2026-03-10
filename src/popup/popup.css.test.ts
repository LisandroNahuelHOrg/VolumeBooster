import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

describe("popup protector style contract", () => {
  it("keeps protector active styles stronger and later than the generic preset glow", () => {
    const source = readFileSync(fileURLToPath(new URL("./popup.css", import.meta.url)), "utf8");
    const genericActiveIndex = source.indexOf(".presets .ghost-button.is-active {");
    const protectorActiveIndex = source.indexOf(".presets .ghost-button--protector.is-active {");
    const genericBeforeIndex = source.indexOf(".presets .ghost-button.is-active::before {");
    const protectorBeforeIndex = source.indexOf(".presets .ghost-button--protector.is-active::before {");

    expect(genericActiveIndex).toBeGreaterThanOrEqual(0);
    expect(protectorActiveIndex).toBeGreaterThan(genericActiveIndex);
    expect(genericBeforeIndex).toBeGreaterThanOrEqual(0);
    expect(protectorBeforeIndex).toBeGreaterThan(genericBeforeIndex);
  });
});
