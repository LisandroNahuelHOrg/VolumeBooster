import { cp, mkdir, rm } from "node:fs/promises";
import { stableFaustWorkspaceFaustDirectory, stableFaustWorkspaceRoot } from "./buildFaustPaths.mjs";

export async function prepareStableFaustWorkspace(sourceDirectory) {
  await rm(stableFaustWorkspaceFaustDirectory, { recursive: true, force: true });
  await mkdir(stableFaustWorkspaceRoot, { recursive: true });
  await cp(sourceDirectory, stableFaustWorkspaceFaustDirectory, { recursive: true, force: true });
  return stableFaustWorkspaceRoot;
}
