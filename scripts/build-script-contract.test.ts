import fs from "node:fs";
import path from "node:path";
import { expect, test } from "vitest";

test("build script refreshes Faust assets before producing final extension bundles", () => {
  const packageJsonPath = path.resolve("package.json");
  const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, "utf8")) as {
    scripts?: Record<string, string>;
  };
  const buildScript = packageJson.scripts?.build ?? "";

  expect(packageJson.scripts?.["faust:refresh"]).toBe("node scripts/build-faust-assets.mjs");
  expect(buildScript).toContain("npm run faust:refresh");
  expect(buildScript).toContain("vite build");
  expect(buildScript).toContain("node scripts/build-registered-content-scripts.mjs");
  expect(buildScript.indexOf("npm run faust:refresh")).toBeGreaterThan(-1);
  expect(buildScript.indexOf("vite build")).toBeGreaterThan(buildScript.indexOf("npm run faust:refresh"));
  expect(buildScript.indexOf("node scripts/build-registered-content-scripts.mjs")).toBeGreaterThan(
    buildScript.indexOf("vite build")
  );
});
