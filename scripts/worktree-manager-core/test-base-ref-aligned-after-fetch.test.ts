import { execFileSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { expect, test } from "vitest";

test("Test-BaseRefAlignedAfterFetch refreshes origin/main before deciding alignment", () => {
  const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), "base-ref-aligned-"));
  const remoteRepo = path.join(tempRoot, "remote.git");
  const seedRepo = path.join(tempRoot, "seed");
  const cloneRepo = path.join(tempRoot, "clone");
  const countsHelperPath = path.resolve("scripts/worktree-manager-core/lib/Get-RefAheadBehindCounts.ps1");
  const fetchHelperPath = path.resolve("scripts/worktree-manager-core/lib/Test-BaseRefAlignedAfterFetch.ps1");
  const helperCommand = [
    `. '${countsHelperPath.replace(/'/gu, "''")}'`,
    `. '${fetchHelperPath.replace(/'/gu, "''")}'`,
    "$result = Test-BaseRefAlignedAfterFetch -RepoPath '" + cloneRepo.replace(/'/gu, "''") + "' -PrimaryRemote 'origin' -BaseBranch 'main' -BaseRef 'origin/main' -TargetRef 'main'",
    "$result | ConvertTo-Json -Compress -Depth 5"
  ].join("; ");

  try {
    execFileSync("git", ["init", "--bare", remoteRepo], { stdio: "ignore" });
    fs.mkdirSync(seedRepo, { recursive: true });
    execFileSync("git", ["init", "--initial-branch=main"], { cwd: seedRepo, stdio: "ignore" });
    execFileSync("git", ["config", "user.email", "codex@example.com"], { cwd: seedRepo, stdio: "ignore" });
    execFileSync("git", ["config", "user.name", "Codex"], { cwd: seedRepo, stdio: "ignore" });
    fs.writeFileSync(path.join(seedRepo, "README.md"), Buffer.from("base\n"));
    execFileSync("git", ["add", "README.md"], { cwd: seedRepo, stdio: "ignore" });
    execFileSync("git", ["commit", "-m", "base"], { cwd: seedRepo, stdio: "ignore" });
    execFileSync("git", ["remote", "add", "origin", remoteRepo], { cwd: seedRepo, stdio: "ignore" });
    execFileSync("git", ["push", "-u", "origin", "main"], { cwd: seedRepo, stdio: "ignore" });
    execFileSync("git", ["symbolic-ref", "HEAD", "refs/heads/main"], { cwd: remoteRepo, stdio: "ignore" });
    execFileSync("git", ["clone", remoteRepo, cloneRepo], { stdio: "ignore" });
    fs.writeFileSync(path.join(seedRepo, "README.md"), Buffer.from("base\nremote\n"));
    execFileSync("git", ["commit", "-am", "remote"], { cwd: seedRepo, stdio: "ignore" });
    execFileSync("git", ["push", "origin", "main"], { cwd: seedRepo, stdio: "ignore" });

    expect(JSON.parse(execFileSync("pwsh", ["-NoProfile", "-Command", helperCommand], { encoding: "utf8" }))).toMatchObject({
      Ahead: 0,
      Behind: 1,
      Aligned: false
    });

    execFileSync("git", ["merge", "--ff-only", "origin/main"], { cwd: cloneRepo, stdio: "ignore" });
    expect(JSON.parse(execFileSync("pwsh", ["-NoProfile", "-Command", helperCommand], { encoding: "utf8" }))).toMatchObject({
      Ahead: 0,
      Behind: 0,
      Aligned: true
    });

    let failureMessage = "";
    try {
      execFileSync(
        "pwsh",
        [
          "-NoProfile",
          "-Command",
          helperCommand.replace("-PrimaryRemote 'origin'", "-PrimaryRemote 'missing'")
        ],
        { encoding: "utf8", stdio: "pipe" }
      );
    } catch (error) {
      failureMessage = String(error);
    }
    expect(failureMessage).toContain("No se pudo refrescar");
  } finally {
    fs.rmSync(tempRoot, { recursive: true, force: true });
  }
});
