function Test-WorktreeClean {
    param([string]$Path)

    if (-not (Test-Path $Path)) {
        return [pscustomobject]@{ IsClean = $false; Reason = "path-missing" }
    }

    $markers = @("rebase-merge", "rebase-apply", "MERGE_HEAD", "CHERRY_PICK_HEAD", "REVERT_HEAD", "BISECT_LOG")
    foreach ($marker in $markers) {
        $gitPath = (& git -C $Path rev-parse --git-path $marker 2>$null | Out-String).Trim()
        if (-not [string]::IsNullOrWhiteSpace($gitPath) -and (Test-Path $gitPath)) {
            return [pscustomobject]@{ IsClean = $false; Reason = "operacion-pendiente:$marker" }
        }
    }

    $status = @((& git -C $Path status --porcelain 2>$null) | Where-Object { $_ })
    if ($status.Count -gt 0) {
        return [pscustomobject]@{ IsClean = $false; Reason = "working-tree-dirty" }
    }

    return [pscustomobject]@{ IsClean = $true; Reason = "clean" }
}
