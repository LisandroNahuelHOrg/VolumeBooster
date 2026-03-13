import { execFileSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { expect, test } from "vitest";

test("worktree-manager wrapper copies and runs the core from a portable install path", { timeout: 30000 }, () => {
  const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), "worktree-manager-wrapper-"));
  const coreInstall = path.join(tempRoot, "portable-core");
  const wrapperPath = path.resolve("scripts/worktree-manager.ps1");
  const repoRoot = path.resolve(".");
  const output = execFileSync(
    "pwsh",
    ["-NoProfile", "-File", wrapperPath, "capabilities", "-Json"],
    {
      cwd: path.resolve("."),
      encoding: "utf8",
      env: { ...process.env, WORKTREE_MANAGER_CORE_INSTALL: coreInstall }
    }
  );

  try {
    const parsed = JSON.parse(output) as Record<string, string>;
    expect(fs.existsSync(path.join(coreInstall, "invoke.ps1"))).toBe(true);
    expect(parsed.manager_runtime).toBe("pwsh");
    expect(path.normalize(parsed.canonical_main_repo_path)).toBe(path.normalize(repoRoot));
  } finally {
    fs.rmSync(tempRoot, { recursive: true, force: true });
  }
});
