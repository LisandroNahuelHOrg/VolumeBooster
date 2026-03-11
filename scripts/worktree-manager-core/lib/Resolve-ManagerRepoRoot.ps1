function Resolve-ManagerRepoRoot {
    param(
        [string]$RepoRootHint,
        [string]$WorkingDirectory
    )

    $candidates = @($RepoRootHint, $WorkingDirectory) | Where-Object { -not [string]::IsNullOrWhiteSpace($_) }
    foreach ($candidate in ($candidates | Select-Object -Unique)) {
        $resolved = (& git -C $candidate rev-parse --show-toplevel 2>$null | Out-String).Trim()
        if ([string]::IsNullOrWhiteSpace($resolved)) {
            continue
        }

        $baseBranchHint = "$($env:WORKTREE_MANAGER_BASE_BRANCH)".Trim()
        if ([string]::IsNullOrWhiteSpace($baseBranchHint)) {
            $remoteHead = (& git -C $resolved symbolic-ref refs/remotes/origin/HEAD 2>$null | Out-String).Trim()
            if ($LASTEXITCODE -eq 0 -and $remoteHead -match '^refs/remotes/origin/(.+)$') {
                $baseBranchHint = $matches[1]
            }
            else {
                $baseBranchHint = "main"
            }
        }

        $registry = @(Get-WorktreeRegistry -RepoRoot $resolved)
        $canonicalEntry = @(
            $registry |
                Where-Object { -not $_.IsDetached -and $_.BranchName -eq $baseBranchHint -and -not [string]::IsNullOrWhiteSpace("$($_.Path)") } |
                Select-Object -First 1
        )
        if ($canonicalEntry.Count -gt 0 -and (Test-Path $canonicalEntry[0].Path)) {
            $canonicalRoot = (& git -C $canonicalEntry[0].Path rev-parse --show-toplevel 2>$null | Out-String).Trim()
            if (-not [string]::IsNullOrWhiteSpace($canonicalRoot)) {
                return $canonicalRoot
            }
        }

        return $resolved
    }

    throw "❌ worktree-manager debe ejecutarse dentro de un repositorio Git válido."
}
