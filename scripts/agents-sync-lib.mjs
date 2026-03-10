import fs from "node:fs";
import { agentMirrorFiles, agentMirrorRoot } from "./agent-mirror-files.mjs";
import { readAgentMirrorState } from "./read-agent-mirror-state.mjs";

export function syncAgentMirrors(options = {}) {
  const repoRoot = options.repoRoot ?? agentMirrorRoot;
  const sourceName = options.sourceName?.trim() ?? "";
  const mirrorNames = [];

  for (const file of agentMirrorFiles) {
    mirrorNames.push(file.name);
  }

  const state = readAgentMirrorState(repoRoot, mirrorNames);
  let sourceFile = null;

  if (sourceName) {
    for (const file of state.files) {
      if (file.name === sourceName) {
        sourceFile = file;
      }
    }

    if (!sourceFile) {
      throw new Error(`Unknown mirror source '${sourceName}'.`);
    }

    if (!sourceFile.exists) {
      throw new Error(`Mirror source '${sourceName}' does not exist.`);
    }
  } else if (state.existingFiles.length === 0) {
    throw new Error("No agent mirror exists. Create AGENTS.md, CLAUDE.md, or GEMINI.md first.");
  } else if (state.existingFiles.length === 1 || state.existingEqual) {
    sourceFile = state.existingFiles[0];
  } else if (state.changedExistingNames.length === 1) {
    for (const file of state.existingFiles) {
      if (file.name === state.changedExistingNames[0]) {
        sourceFile = file;
      }
    }
  } else {
    throw new Error(
      "AGENTS.md, CLAUDE.md, and GEMINI.md diverged ambiguously. Manually reconcile one canonical file, then rerun agents:sync."
    );
  }

  const sourceBuffer = sourceFile.buffer ?? fs.readFileSync(sourceFile.path);
  const writtenNames = [];
  const createdNames = [];

  for (const file of state.files) {
    if (file.name === sourceFile.name && file.exists && sourceBuffer.equals(file.buffer)) {
      continue;
    }

    if (!file.exists || !sourceBuffer.equals(file.buffer)) {
      fs.writeFileSync(file.path, sourceBuffer);
      writtenNames.push(file.name);
    }

    if (!file.exists) {
      createdNames.push(file.name);
    }
  }

  return {
    sourceName: sourceFile.name,
    writtenNames,
    createdNames
  };
}
