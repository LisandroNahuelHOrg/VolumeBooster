import fs from "node:fs";
import path from "node:path";
import { expect, test } from "vitest";

test("build script refreshes Faust assets before producing final extension bundles", () => {
  const packageJsonPath = path.resolve("package.json");
  const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, "utf8")) as {
    scripts?: Record<string, string>;
  };
  const buildFaustAssetsScript = fs.readFileSync(path.resolve("scripts/build-faust-assets.mjs"), "utf8");
  const buildScript = packageJson.scripts?.build ?? "";
  const viteBuildInvocation = buildScript.includes("node ./node_modules/vite/bin/vite.js build")
    ? "node ./node_modules/vite/bin/vite.js build"
    : "vite build";

  expect(packageJson.scripts?.["faust:refresh"]).toBe("node scripts/build-faust-assets.mjs");
  expect(buildScript).toContain("npm run faust:refresh");
  expect(buildScript).toContain(viteBuildInvocation);
  expect(buildScript).toContain("node scripts/build-registered-content-scripts.mjs");
  expect(buildScript.indexOf("npm run faust:refresh")).toBeGreaterThan(-1);
  expect(buildScript.indexOf(viteBuildInvocation)).toBeGreaterThan(buildScript.indexOf("npm run faust:refresh"));
  expect(buildScript.indexOf("node scripts/build-registered-content-scripts.mjs")).toBeGreaterThan(
    buildScript.indexOf(viteBuildInvocation)
  );
  expect(buildFaustAssetsScript).toContain('input: "faust/prism-premium-mono.dsp"');
  expect(buildFaustAssetsScript).toContain('input: "faust/prism-premium-stereo.dsp"');
  expect(buildFaustAssetsScript).toContain("prepareStableFaustWorkspace");
  expect(buildFaustAssetsScript).toContain('await buildTarget(target, stableFaustWorkspace);');
});
