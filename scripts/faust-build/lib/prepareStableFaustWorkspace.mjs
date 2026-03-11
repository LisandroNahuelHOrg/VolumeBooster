import { cp, mkdir, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

export async function prepareStableFaustWorkspace(sourceDirectory) {
  const workspaceRoot = join(tmpdir(), "volume-booster-faust-workspace");
  const workspaceFaustDirectory = join(workspaceRoot, "faust");
  await rm(workspaceFaustDirectory, { recursive: true, force: true });
  await mkdir(workspaceRoot, { recursive: true });
  await cp(sourceDirectory, workspaceFaustDirectory, { recursive: true, force: true });
  return workspaceRoot;
}
