function Get-RefAheadBehindCounts {
    param(
        [Parameter(Mandatory = $true)]
        [string]$RepoPath,
        [Parameter(Mandatory = $true)]
        [string]$BaseRef,
        [Parameter(Mandatory = $true)]
        [string]$TargetRef
    )

    $raw = (git -C $RepoPath rev-list --left-right --count "$BaseRef...$TargetRef" | Out-String).Trim()
    if ($LASTEXITCODE -ne 0 -or [string]::IsNullOrWhiteSpace($raw)) {
        throw "❌ No se pudo obtener ahead/behind para '$TargetRef' vs '$BaseRef' en '$RepoPath'."
    }

    $parts = $raw -split "\s+"
    if ($parts.Count -lt 2) {
        throw "❌ Salida inválida de rev-list: '$raw'."
    }

    $behind = 0
    $ahead = 0
    [void][int]::TryParse("$($parts[0])", [ref]$behind)
    [void][int]::TryParse("$($parts[1])", [ref]$ahead)

    return [pscustomobject]@{
        behind = $behind
        ahead  = $ahead
    }
}
