import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { test, expect } from "vitest";
import { verifyAgentMirrors } from "./agents-verify-lib.mjs";

test("verify accepts identical mirrors and rejects missing files, content drift, and line-ending drift", () => {
  const repoRoot = fs.mkdtempSync(path.join(os.tmpdir(), "agents-verify-"));
  const agentsPath = path.join(repoRoot, "AGENTS.md");
  const claudePath = path.join(repoRoot, "CLAUDE.md");
  const geminiPath = path.join(repoRoot, "GEMINI.md");

  fs.writeFileSync(agentsPath, Buffer.from("delta\r\n"));
  fs.writeFileSync(claudePath, Buffer.from("delta\r\n"));
  fs.writeFileSync(geminiPath, Buffer.from("delta\r\n"));

  expect(verifyAgentMirrors({ repoRoot }).ok).toBe(true);

  fs.unlinkSync(geminiPath);
  let missingError = "";

  try {
    verifyAgentMirrors({ repoRoot });
  } catch (error) {
    missingError = error instanceof Error ? error.message : String(error);
  }

  expect(missingError).toMatch(/Missing mirror files: GEMINI.md\./u);

  fs.writeFileSync(geminiPath, Buffer.from("delta\r\n"));
  fs.writeFileSync(claudePath, Buffer.from("echo\r\n"));
  let driftError = "";

  try {
    verifyAgentMirrors({ repoRoot });
  } catch (error) {
    driftError = error instanceof Error ? error.message : String(error);
  }

  expect(driftError).toMatch(/Mirror files differ/u);

  fs.writeFileSync(claudePath, Buffer.from("delta\n"));
  let lineEndingError = "";

  try {
    verifyAgentMirrors({ repoRoot });
  } catch (error) {
    lineEndingError = error instanceof Error ? error.message : String(error);
  }

  expect(lineEndingError).toMatch(/Mirror files differ/u);
});
