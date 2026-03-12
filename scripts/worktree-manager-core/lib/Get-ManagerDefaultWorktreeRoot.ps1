function Get-ManagerDefaultWorktreeRoot {
    $override = "$($env:WORKTREE_MANAGER_WORKTREE_ROOT)".Trim()
    if ([string]::IsNullOrWhiteSpace($override)) {
        $override = "$($env:WORKTREE_MANAGER_TREE_ROOT)".Trim()
    }

    if (-not [string]::IsNullOrWhiteSpace($override)) {
        return $override
    }

    if ($IsWindows) {
        return "D:\Local Worktrees"
    }

    $homeRoot = [Environment]::GetFolderPath([Environment+SpecialFolder]::UserProfile)
    if ([string]::IsNullOrWhiteSpace($homeRoot)) {
        $homeRoot = [System.IO.Path]::GetTempPath().TrimEnd('\', '/')
    }

    return (Join-Path $homeRoot "Local Worktrees")
}
