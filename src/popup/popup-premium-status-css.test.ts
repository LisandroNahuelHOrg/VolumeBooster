import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

it("keeps the lifetime premium status badge stylesheet contract", () => {
  const source = readFileSync(fileURLToPath(new URL("./popup-premium-status.css", import.meta.url)), "utf8");

  expect(source).toContain(".popup-premium-status-card:not(.popup-premium-status-card--lifetime) .panel__title");
  expect(source).toContain(".popup-premium-status-card--lifetime");
  expect(source).toContain(".popup-premium-status-badge--lifetime");
  expect(source).toContain("@keyframes popup-premium-status-breathe");
  expect(source).toContain("@keyframes popup-premium-status-glaze");
  expect(source).toContain("@media (prefers-reduced-motion: reduce)");
});
