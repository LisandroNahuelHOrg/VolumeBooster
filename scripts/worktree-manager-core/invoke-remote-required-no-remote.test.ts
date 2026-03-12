import { execFileSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { expect, test } from "vitest";

test("invoke still fails for remote-required commands when the repo has no remote", () => {
  const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), "invoke-required-no-remote-"));
  const repoRoot = path.join(tempRoot, "repo");
  const adapterPath = path.resolve("scripts/worktree-manager.github-adapter.ps1");
  const invokePath = path.resolve("scripts/worktree-manager-core/invoke.ps1");

  try {
    fs.mkdirSync(repoRoot, { recursive: true });
    execFileSync("git", ["init", "--initial-branch=main"], { cwd: repoRoot, stdio: "ignore" });
    let failureText = "";

    try {
      execFileSync(
        "pwsh",
        ["-NoProfile", "-File", invokePath, "-Command", "create", "-Type", "feat", "-Agent", "ag1", "-Scope", "demo", "-RepoRoot", repoRoot, "-AdapterPath", adapterPath],
        { encoding: "utf8", stdio: "pipe" }
      );
    } catch (error) {
      failureText = String(error);
    }

    expect(failureText).toContain("no tiene remotes configurados");
  } finally {
    fs.rmSync(tempRoot, { recursive: true, force: true });
  }
});
