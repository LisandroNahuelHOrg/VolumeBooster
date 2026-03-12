function Get-PathGitTopLevel {
    param(
        [Parameter(Mandatory = $true)]
        [string]$Path
    )

    if (-not (Test-Path $Path)) {
        return ""
    }

    $insideWorkTree = (& git -C $Path rev-parse --is-inside-work-tree 2>$null | Out-String).Trim()
    if ($LASTEXITCODE -eq 0 -and $insideWorkTree -eq "true") {
        $root = (& git -C $Path rev-parse --path-format=absolute --show-toplevel 2>$null | Out-String).Trim()
        if ($LASTEXITCODE -ne 0 -or [string]::IsNullOrWhiteSpace($root)) {
            return ""
        }

        return [System.IO.Path]::GetFullPath($root).TrimEnd("\", "/")
    }

    $isBareRepository = (& git -C $Path rev-parse --is-bare-repository 2>$null | Out-String).Trim()
    if ($LASTEXITCODE -ne 0 -or $isBareRepository -ne "true") {
        return ""
    }

    $gitDir = (& git -C $Path rev-parse --path-format=absolute --git-dir 2>$null | Out-String).Trim()
    if ($LASTEXITCODE -ne 0 -or [string]::IsNullOrWhiteSpace($gitDir)) {
        return ""
    }

    return [System.IO.Path]::GetFullPath($gitDir).TrimEnd("\", "/")
}
