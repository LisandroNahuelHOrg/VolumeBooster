import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { expect, test } from "vitest";
import { stableFaustEnvironmentRoot } from "./buildFaustPaths.mjs";
import { prepareStableFaustToolchain } from "./prepareStableFaustToolchain.mjs";

test("prepareStableFaustToolchain overwrites a fixed temp toolchain path instead of leaking checkout-specific paths", async () => {
  const testRoot = fs.mkdtempSync(path.join(os.tmpdir(), "prepare-stable-faust-toolchain-"));
  const sourceA = path.join(testRoot, "source-a", "node_modules", "@grame", "faustwasm");
  const sourceB = path.join(testRoot, "source-b", "node_modules", "@grame", "faustwasm");
  let stableCompilerPath = "";

  try {
    fs.mkdirSync(path.join(sourceA, "scripts"), { recursive: true });
    fs.mkdirSync(path.join(sourceB, "scripts"), { recursive: true });
    fs.writeFileSync(path.join(sourceA, "scripts", "faust2wasm.js"), "source-a", "utf8");
    fs.writeFileSync(path.join(sourceB, "scripts", "faust2wasm.js"), "source-b", "utf8");

    const stableCompilerA = await prepareStableFaustToolchain(sourceA);
    const stableCompilerB = await prepareStableFaustToolchain(sourceB);
    stableCompilerPath = stableCompilerB;

    expect(stableCompilerA).toBe(stableCompilerB);
    expect(stableCompilerA).not.toContain("source-a");
    expect(stableCompilerA).not.toContain("source-b");
    expect(fs.readFileSync(stableCompilerB, "utf8")).toBe("source-b");
  } finally {
    fs.rmSync(testRoot, { recursive: true, force: true });
    fs.rmSync(stableCompilerPath ? stableFaustEnvironmentRoot : path.join(os.tmpdir(), "noop"), { recursive: true, force: true });
  }
});
