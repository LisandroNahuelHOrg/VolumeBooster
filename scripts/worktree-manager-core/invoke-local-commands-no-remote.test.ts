import { execFileSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { expect, test } from "vitest";

test("invoke keeps local-only commands working without remotes", { timeout: 30000 }, () => {
  const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), "invoke-local-no-remote-"));
  const repoRoot = path.join(tempRoot, "repo");
  const adapterPath = path.resolve("scripts/worktree-manager.github-adapter.ps1");
  const invokePath = path.resolve("scripts/worktree-manager-core/invoke.ps1");

  try {
    fs.mkdirSync(repoRoot, { recursive: true });
    execFileSync("git", ["init", "--initial-branch=main"], { cwd: repoRoot, stdio: "ignore" });
    execFileSync("git", ["config", "user.email", "codex@example.com"], { cwd: repoRoot, stdio: "ignore" });
    execFileSync("git", ["config", "user.name", "Codex"], { cwd: repoRoot, stdio: "ignore" });
    fs.writeFileSync(path.join(repoRoot, "README.md"), Buffer.from("base\n"));
    execFileSync("git", ["add", "README.md"], { cwd: repoRoot, stdio: "ignore" });
    execFileSync("git", ["commit", "-m", "base"], { cwd: repoRoot, stdio: "ignore" });

    const helpOutput = execFileSync("pwsh", ["-NoProfile", "-File", invokePath, "-Command", "help", "-RepoRoot", repoRoot, "-AdapterPath", adapterPath, "-Foreground"], { encoding: "utf8" });
    const listOutput = execFileSync("pwsh", ["-NoProfile", "-File", invokePath, "-Command", "list", "-RepoRoot", repoRoot, "-AdapterPath", adapterPath, "-Foreground"], { encoding: "utf8" });
    const scopeOutput = execFileSync("pwsh", ["-NoProfile", "-File", invokePath, "-Command", "scope-check", "-Scope", "demo", "-RepoRoot", repoRoot, "-AdapterPath", adapterPath, "-Foreground"], { encoding: "utf8" });
    const fixedListOutput = execFileSync("pwsh", ["-NoProfile", "-File", invokePath, "-Command", "fixed-list", "-RepoRoot", repoRoot, "-AdapterPath", adapterPath, "-Foreground"], { encoding: "utf8" });

    expect(helpOutput).toContain("Universal Worktree Manager GitHub Adapter");
    expect(listOutput).toContain("Active Worktrees & Scope Locks");
    expect(scopeOutput).toContain("Scope 'demo' LIBRE");
    expect(fixedListOutput).toContain("Fixed Monitor Worktrees");
  } finally {
    fs.rmSync(tempRoot, { recursive: true, force: true });
  }
});
