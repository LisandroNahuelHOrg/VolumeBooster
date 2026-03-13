function Get-ManagerDefaultRoots {
    param([string]$RepoRoot)

    $override = "$($env:WORKTREE_MANAGER_PORTABLE_ROOT)".Trim()
    if (-not [string]::IsNullOrWhiteSpace($override)) {
        $worktreeBase = $override
    }
    elseif ($IsWindows) {
        $worktreeBase = "D:\Local Worktrees"
    }
    else {
        $worktreeBase = Join-Path ([System.IO.Path]::GetTempPath()) "Local Worktrees"
    }

    $cacheBase = Join-Path $worktreeBase ".manager-cache"
    return [pscustomobject]@{
        RepoRoot = $RepoRoot
        WorktreeBase = $worktreeBase
        CacheBase = $cacheBase
    }
}
