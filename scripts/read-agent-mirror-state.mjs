import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";

export function readAgentMirrorState(repoRoot, mirrorNames) {
  const files = [];
  const existingFiles = [];
  let statusOutput = "";

  for (const name of mirrorNames) {
    const filePath = path.join(repoRoot, name);
    const exists = fs.existsSync(filePath);
    const file = {
      name,
      path: filePath,
      exists,
      buffer: exists ? fs.readFileSync(filePath) : null
    };

    files.push(file);
    if (exists) {
      existingFiles.push(file);
    }
  }

  try {
    statusOutput = execFileSync(
      "git",
      ["-C", repoRoot, "status", "--porcelain", "--untracked-files=all", "--", ...mirrorNames],
      { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }
    );
  } catch {
    statusOutput = "";
  }

  const changedNames = [];
  for (const rawLine of statusOutput.split(/\r?\n/u)) {
    if (!rawLine.trim()) {
      continue;
    }

    const rawName = rawLine.slice(3).trim();
    const normalizedName = rawName.includes(" -> ")
      ? rawName.split(" -> ")[1].trim()
      : rawName;

    if (!changedNames.includes(normalizedName)) {
      changedNames.push(normalizedName);
    }
  }

  const changedExistingNames = [];
  for (const file of existingFiles) {
    if (changedNames.includes(file.name)) {
      changedExistingNames.push(file.name);
    }
  }

  let existingEqual = true;
  if (existingFiles.length > 1) {
    const referenceBuffer = existingFiles[0].buffer;

    for (let index = 1; index < existingFiles.length; index += 1) {
      if (!referenceBuffer.equals(existingFiles[index].buffer)) {
        existingEqual = false;
        break;
      }
    }
  }

  return {
    files,
    existingFiles,
    changedNames,
    changedExistingNames,
    existingEqual
  };
}
