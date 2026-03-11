import { tmpdir } from "node:os";
import { join } from "node:path";

// Renaming this root changes generated Faust artifacts, so keep it stable on purpose.
export const stableFaustEnvironmentRoot = join(tmpdir(), "volume-booster-faust-stable-environment-v1");
export const stableFaustWorkspaceRoot = join(stableFaustEnvironmentRoot, "workspace");
export const stableFaustWorkspaceFaustDirectory = join(stableFaustWorkspaceRoot, "faust");
export const stableFaustToolchainRoot = join(stableFaustEnvironmentRoot, "toolchain");
export const stableFaustToolchainPackageDirectory = join(
  stableFaustToolchainRoot,
  "node_modules",
  "@grame",
  "faustwasm"
);
