function Get-WorktreeRegistry {
    param([string]$RepoRoot)

    $lines = & git -C $RepoRoot worktree list --porcelain 2>$null
    $entries = @()
    $current = [ordered]@{}

    foreach ($line in $lines + @("")) {
        if ([string]::IsNullOrWhiteSpace($line)) {
            if ($current.path) {
                $entries += [pscustomobject]@{
                    Path = $current.path
                    Head = $current.head
                    BranchName = $current.branch
                    IsDetached = [bool]$current.detached
                    Prunable = [bool]$current.prunable
                }
            }
            $current = [ordered]@{}
            continue
        }

        if ($line -like "worktree *") { $current.path = $line.Substring(9); continue }
        if ($line -like "HEAD *") { $current.head = $line.Substring(5); continue }
        if ($line -like "branch *") { $current.branch = ($line.Substring(7) -replace "^refs/heads/", ""); continue }
        if ($line -eq "detached") { $current.detached = $true; continue }
        if ($line -like "prunable*") { $current.prunable = $true }
    }

    return $entries
}
