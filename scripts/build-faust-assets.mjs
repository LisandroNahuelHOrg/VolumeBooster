import { resolve } from "node:path";
import { buildFaustTarget } from "./faust-build/lib/buildFaustTarget.mjs";
import { createFaustTargets } from "./faust-build/lib/createFaustTargets.mjs";
import { prepareStableFaustToolchain } from "./faust-build/lib/prepareStableFaustToolchain.mjs";
import { prepareStableFaustWorkspace } from "./faust-build/lib/prepareStableFaustWorkspace.mjs";

const repoRoot = resolve(import.meta.dirname, "..");
const stableFaustWorkspace = await prepareStableFaustWorkspace(resolve(repoRoot, "faust"));
const compilerScript = await prepareStableFaustToolchain(resolve(repoRoot, "node_modules/@grame/faustwasm"));

for (const target of createFaustTargets(repoRoot)) {
  await buildFaustTarget(target, compilerScript, stableFaustWorkspace);
}
