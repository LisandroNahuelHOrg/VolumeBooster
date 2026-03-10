import path from "node:path";
import { fileURLToPath } from "node:url";

const currentDir = path.dirname(fileURLToPath(import.meta.url));

export const agentMirrorRoot = path.resolve(currentDir, "..");
export const agentsMirrorPath = path.join(agentMirrorRoot, "AGENTS.md");
export const claudeMirrorPath = path.join(agentMirrorRoot, "CLAUDE.md");
export const geminiMirrorPath = path.join(agentMirrorRoot, "GEMINI.md");
export const agentMirrorFiles = [
  { name: "AGENTS.md", path: agentsMirrorPath },
  { name: "CLAUDE.md", path: claudeMirrorPath },
  { name: "GEMINI.md", path: geminiMirrorPath }
];
