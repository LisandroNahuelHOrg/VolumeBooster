function Assert-ManagedPathIsNotForeignRepo {
    param(
        [Parameter(Mandatory = $true)]
        [string]$PathUnderCheck,
        [Parameter(Mandatory = $true)]
        [string]$RepoRoot
    )

    if (-not (Test-Path $PathUnderCheck)) {
        return
    }

    $candidateTopLevel = Get-PathGitTopLevel -Path $PathUnderCheck
    if (-not $candidateTopLevel) {
        return
    }

    $repoCommonDir = (& git -C $RepoRoot rev-parse --path-format=absolute --git-common-dir 2>$null | Out-String).Trim()
    $candidateCommonDir = (& git -C $PathUnderCheck rev-parse --path-format=absolute --git-common-dir 2>$null | Out-String).Trim()
    if ($LASTEXITCODE -ne 0 -or [string]::IsNullOrWhiteSpace($candidateCommonDir)) {
        return
    }

    $repoFull = [System.IO.Path]::GetFullPath($repoCommonDir).TrimEnd("\", "/")
    $candidateFull = [System.IO.Path]::GetFullPath($candidateCommonDir).TrimEnd("\", "/")
    if ($IsWindows) {
        $repoFull = $repoFull.ToLowerInvariant()
        $candidateFull = $candidateFull.ToLowerInvariant()
    }

    if ($repoFull -ne $candidateFull) {
        throw "❌ '$PathUnderCheck' pertenece a otro repo ('$candidateTopLevel'). No se permite operar sobre el path administrado."
    }
}
