import fs from "node:fs";
import path from "node:path";
import { expect, test } from "vitest";

test("keeps every e2e:auto script pointed at scripts/e2e/auto-booster.mjs", () => {
  const packageJsonPath = path.resolve("package.json");
  const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, "utf8")) as {
    scripts?: Record<string, string>;
  };

  expect(packageJson.scripts?.["e2e:auto:fixtures"]).toBe("npm run build && node scripts/e2e/auto-booster.mjs --targets=fixtures");
  expect(packageJson.scripts?.["e2e:auto:sites"]).toBe("npm run build && node scripts/e2e/auto-booster.mjs --targets=public-sites");
  expect(packageJson.scripts?.["e2e:auto"]).toBe("npm run build && node scripts/e2e/auto-booster.mjs --targets=all");
});
