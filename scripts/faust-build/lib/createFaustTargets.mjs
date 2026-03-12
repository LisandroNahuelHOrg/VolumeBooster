import { resolve } from "node:path";

export function createFaustTargets(repoRoot) {
  return [
    {
      input: "faust/prism-premium-mono.dsp",
      output: resolve(repoRoot, "src/generated/faust/mono"),
      runtimeOutput: resolve(repoRoot, "public/faust/mono")
    },
    {
      input: "faust/prism-premium-stereo.dsp",
      output: resolve(repoRoot, "src/generated/faust/stereo"),
      runtimeOutput: resolve(repoRoot, "public/faust/stereo")
    }
  ];
}
