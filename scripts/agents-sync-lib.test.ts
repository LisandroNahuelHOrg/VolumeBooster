import { execFileSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { test, expect } from "vitest";
import { syncAgentMirrors } from "./agents-sync-lib.mjs";

test("sync bootstraps, recovers missing mirrors, honors explicit source, and fails closed on ambiguous drift", () => {
  const repoRoot = fs.mkdtempSync(path.join(os.tmpdir(), "agents-sync-"));
  const agentsPath = path.join(repoRoot, "AGENTS.md");
  const claudePath = path.join(repoRoot, "CLAUDE.md");
  const geminiPath = path.join(repoRoot, "GEMINI.md");

  execFileSync("git", ["init"], { cwd: repoRoot, stdio: "ignore" });
  execFileSync("git", ["config", "user.email", "codex@example.com"], { cwd: repoRoot, stdio: "ignore" });
  execFileSync("git", ["config", "user.name", "Codex"], { cwd: repoRoot, stdio: "ignore" });

  fs.writeFileSync(agentsPath, Buffer.from("alpha\r\n"));
  expect(syncAgentMirrors({ repoRoot }).sourceName).toBe("AGENTS.md");
  expect(fs.readFileSync(claudePath).equals(fs.readFileSync(agentsPath))).toBe(true);
  expect(fs.readFileSync(geminiPath).equals(fs.readFileSync(agentsPath))).toBe(true);

  execFileSync("git", ["add", "AGENTS.md", "CLAUDE.md", "GEMINI.md"], { cwd: repoRoot, stdio: "ignore" });
  execFileSync("git", ["commit", "-m", "baseline"], { cwd: repoRoot, stdio: "ignore" });

  fs.writeFileSync(agentsPath, Buffer.from("bravo\r\n"));
  expect(syncAgentMirrors({ repoRoot }).sourceName).toBe("AGENTS.md");
  expect(fs.readFileSync(claudePath).equals(Buffer.from("bravo\r\n"))).toBe(true);
  expect(fs.readFileSync(geminiPath).equals(Buffer.from("bravo\r\n"))).toBe(true);

  fs.unlinkSync(geminiPath);
  syncAgentMirrors({ repoRoot });
  expect(fs.existsSync(geminiPath)).toBe(true);
  expect(fs.readFileSync(geminiPath).equals(fs.readFileSync(agentsPath))).toBe(true);

  fs.writeFileSync(claudePath, Buffer.from("charlie\r\n"));
  expect(syncAgentMirrors({ repoRoot, sourceName: "CLAUDE.md" }).sourceName).toBe("CLAUDE.md");
  expect(fs.readFileSync(agentsPath).equals(Buffer.from("charlie\r\n"))).toBe(true);
  expect(fs.readFileSync(geminiPath).equals(Buffer.from("charlie\r\n"))).toBe(true);

  fs.writeFileSync(agentsPath, Buffer.from("one\r\n"));
  fs.writeFileSync(claudePath, Buffer.from("two\r\n"));
  fs.writeFileSync(geminiPath, Buffer.from("three\r\n"));
  let ambiguousError = "";

  try {
    syncAgentMirrors({ repoRoot });
  } catch (error) {
    ambiguousError = error instanceof Error ? error.message : String(error);
  }

  expect(ambiguousError).toMatch(/diverged ambiguously/u);
});
