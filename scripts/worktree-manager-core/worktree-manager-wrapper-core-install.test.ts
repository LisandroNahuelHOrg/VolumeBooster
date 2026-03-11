import { execFileSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { expect, test } from "vitest";

test("worktree-manager wrapper copies and runs the core from a portable install path", () => {
  const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), "worktree-manager-wrapper-"));
  const coreInstall = path.join(tempRoot, "portable-core");
  const wrapperPath = path.resolve("scripts/worktree-manager.ps1");
  const repoName = "Chromium - Volume Booster";
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
    expect(fs.existsSync(path.join(coreInstall, "invoke.ps1"))).toBe(true);
    expect(JSON.parse(output)).toMatchObject({
      manager_runtime: "pwsh",
      canonical_main_repo_path: expect.stringContaining(repoName)
    });
  } finally {
    fs.rmSync(tempRoot, { recursive: true, force: true });
  }
});
