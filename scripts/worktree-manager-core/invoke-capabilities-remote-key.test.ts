import { execFileSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { expect, test } from "vitest";

test("invoke capabilities keeps preferring the remote-derived repo key when origin exists", { timeout: 30000 }, () => {
  const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), "invoke-capabilities-remote-"));
  const repoRoot = path.join(tempRoot, "local-name");
  const adapterPath = path.resolve("scripts/worktree-manager.github-adapter.ps1");
  const invokePath = path.resolve("scripts/worktree-manager-core/invoke.ps1");

  try {
    fs.mkdirSync(repoRoot, { recursive: true });
    execFileSync("git", ["init", "--initial-branch=main"], { cwd: repoRoot, stdio: "ignore" });
    execFileSync("git", ["remote", "add", "origin", "https://github.com/acme/volume-booster.git"], { cwd: repoRoot, stdio: "ignore" });
    const output = execFileSync(
      "pwsh",
      ["-NoProfile", "-File", invokePath, "-Command", "capabilities", "-RepoRoot", repoRoot, "-AdapterPath", adapterPath, "-Json"],
      { encoding: "utf8" }
    );

    expect(JSON.parse(output)).toMatchObject({
      repo_key: "acme__volume-booster",
      worktree_root: path.join("D:\\Local Worktrees", "acme__volume-booster"),
      scope_lock_file_path: path.join(repoRoot, ".agent\\worktree-scope-lock.acme__volume-booster.json")
    });
  } finally {
    fs.rmSync(tempRoot, { recursive: true, force: true });
  }
});
