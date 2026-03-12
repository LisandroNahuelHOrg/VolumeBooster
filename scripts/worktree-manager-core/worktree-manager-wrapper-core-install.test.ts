import { execFileSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { expect, test } from "vitest";

test("worktree-manager wrapper copies and runs the core from a portable install path", { timeout: 30000 }, () => {
  const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), "worktree-manager-wrapper-"));
  const coreInstall = path.join(tempRoot, "portable-core");
  const worktreeBaseRoot = path.join(tempRoot, "portable-worktrees");
  const wrapperPath = path.resolve("scripts/worktree-manager.ps1");
  const output = execFileSync(
    "pwsh",
    ["-NoProfile", "-File", wrapperPath, "capabilities", "-Json"],
    {
      cwd: path.resolve("."),
      encoding: "utf8",
      env: { ...process.env, WORKTREE_MANAGER_CORE_INSTALL: coreInstall, WORKTREE_MANAGER_WORKTREE_ROOT: worktreeBaseRoot }
    }
  );

  try {
    expect(fs.existsSync(path.join(coreInstall, "invoke.ps1"))).toBe(true);
    expect(JSON.parse(output)).toMatchObject({ manager_runtime: "pwsh" });
    expect(path.normalize(JSON.parse(output).canonical_main_repo_path)).toBe(path.normalize(path.resolve(".")));
  } finally {
    fs.rmSync(tempRoot, { recursive: true, force: true });
  }
});
