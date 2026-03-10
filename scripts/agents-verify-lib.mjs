import { agentMirrorFiles, agentMirrorRoot } from "./agent-mirror-files.mjs";
import { readAgentMirrorState } from "./read-agent-mirror-state.mjs";

export function verifyAgentMirrors(options = {}) {
  const repoRoot = options.repoRoot ?? agentMirrorRoot;
  const mirrorNames = [];

  for (const file of agentMirrorFiles) {
    mirrorNames.push(file.name);
  }

  const state = readAgentMirrorState(repoRoot, mirrorNames);

  if (state.existingFiles.length !== mirrorNames.length) {
    const missingNames = [];

    for (const file of state.files) {
      if (!file.exists) {
        missingNames.push(file.name);
      }
    }

    throw new Error(`Missing mirror files: ${missingNames.join(", ")}.`);
  }

  const referenceFile = state.existingFiles[0];
  const driftedNames = [];

  for (let index = 1; index < state.existingFiles.length; index += 1) {
    if (!referenceFile.buffer.equals(state.existingFiles[index].buffer)) {
      driftedNames.push(state.existingFiles[index].name);
    }
  }

  if (driftedNames.length > 0) {
    throw new Error(
      `Mirror files differ from ${referenceFile.name}: ${driftedNames.join(", ")}.`
    );
  }

  return {
    ok: true,
    fileNames: mirrorNames
  };
}
