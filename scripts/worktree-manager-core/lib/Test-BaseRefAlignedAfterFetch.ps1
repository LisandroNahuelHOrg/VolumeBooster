function Test-BaseRefAlignedAfterFetch {
    param(
        [Parameter(Mandatory = $true)]
        [string]$RepoPath,
        [Parameter(Mandatory = $true)]
        [string]$PrimaryRemote,
        [Parameter(Mandatory = $true)]
        [string]$BaseBranch,
        [Parameter(Mandatory = $true)]
        [string]$BaseRef,
        [Parameter(Mandatory = $true)]
        [string]$TargetRef
    )

    git -C $RepoPath fetch $PrimaryRemote $BaseBranch --prune 2>&1 | Out-Null
    if ($LASTEXITCODE -ne 0) {
        throw "❌ No se pudo refrescar '$BaseRef' antes de verificar alineación en '$RepoPath'."
    }

    $counts = Get-RefAheadBehindCounts -RepoPath $RepoPath -BaseRef $BaseRef -TargetRef $TargetRef
    return [pscustomobject]@{
        Ahead   = $counts.ahead
        Behind  = $counts.behind
        Aligned = $counts.ahead -eq 0 -and $counts.behind -eq 0
    }
}
