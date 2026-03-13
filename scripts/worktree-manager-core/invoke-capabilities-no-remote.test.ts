import { execFileSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { expect, test } from "vitest";

test("invoke capabilities falls back to local context when the repo has no remote", { timeout: 30000 }, () => {
  const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), "invoke-capabilities-no-remote-"));
  const repoRoot = path.join(tempRoot, "local-only-repo");
  const defaultWorktreeBase = process.platform === "win32" ? "D:\\Local Worktrees" : path.join(os.tmpdir(), "Local Worktrees");
  const adapterPath = path.resolve("scripts/worktree-manager.github-adapter.ps1");
  const invokePath = path.resolve("scripts/worktree-manager-core/invoke.ps1");

  try {
    fs.mkdirSync(repoRoot, { recursive: true });
    execFileSync("git", ["init", "--initial-branch=main"], { cwd: repoRoot, stdio: "ignore" });
    const output = execFileSync(
      "pwsh",
      ["-NoProfile", "-File", invokePath, "-Command", "capabilities", "-RepoRoot", repoRoot, "-AdapterPath", adapterPath, "-Json"],
      { encoding: "utf8" }
    );

    const parsed = JSON.parse(output) as Record<string, string>;

    expect(parsed.base_branch).toBe("main");
    expect(parsed.repo_key).toBe(path.basename(repoRoot));
    expect(path.normalize(parsed.canonical_main_repo_path)).toBe(path.normalize(repoRoot));
    expect(path.normalize(parsed.worktree_root)).toBe(path.normalize(path.join(defaultWorktreeBase, path.basename(repoRoot))));
    expect(path.normalize(parsed.scope_lock_file_path)).toBe(
      path.normalize(path.join(repoRoot, ".agent", `worktree-scope-lock.${path.basename(repoRoot)}.json`))
    );
  } finally {
    fs.rmSync(tempRoot, { recursive: true, force: true });
  }
});
