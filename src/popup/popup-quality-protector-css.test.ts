import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

describe("popup quality protector css", () => {
  const source = readFileSync(fileURLToPath(new URL("./popup-quality-protector.css", import.meta.url)), "utf8");

  it("keeps the quality protector copy anchored to the top-left edge", () => {
    expect(source).toContain(".quality-protector__top");
    expect(source).toContain("align-items: flex-start;");
    expect(source).toContain("justify-content: flex-start;");
    expect(source).toContain(".quality-protector__header");
    expect(source).toContain("width: 100%;");
    expect(source).toContain(".quality-protector__copy");
    expect(source).toContain("align-content: start;");
    expect(source).toContain("justify-items: start;");
  });
});
