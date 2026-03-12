import { cp, mkdir, rm } from "node:fs/promises";
import { join } from "node:path";
import { stableFaustToolchainPackageDirectory, stableFaustToolchainRoot } from "./buildFaustPaths.mjs";

export async function prepareStableFaustToolchain(sourceDirectory) {
  await rm(stableFaustToolchainPackageDirectory, { recursive: true, force: true });
  await mkdir(stableFaustToolchainRoot, { recursive: true });
  await cp(sourceDirectory, stableFaustToolchainPackageDirectory, { recursive: true, force: true });
  return join(stableFaustToolchainPackageDirectory, "scripts", "faust2wasm.js");
}
