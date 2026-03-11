function Resolve-AdapterPath {
    param(
        [string]$RepoRoot,
        [string]$AdapterPathHint,
        $Config
    )

    $rawPath = if (-not [string]::IsNullOrWhiteSpace($AdapterPathHint)) { $AdapterPathHint } elseif (-not [string]::IsNullOrWhiteSpace("$($Config.adapter.path)")) { "$($Config.adapter.path)" } else { "scripts\worktree-manager.github-adapter.ps1" }
    $provider = if (-not [string]::IsNullOrWhiteSpace("$($Config.adapter.provider)")) { "$($Config.adapter.provider)".Trim().ToLowerInvariant() } else { "github" }
    $resolvedPath = if ([System.IO.Path]::IsPathRooted($rawPath)) { $rawPath } else { Join-Path $RepoRoot $rawPath }

    if (-not (Test-Path $resolvedPath)) {
        throw "❌ No se encontró el adapter configurado: $resolvedPath"
    }

    return [pscustomobject]@{
        Path = $resolvedPath
        Provider = $provider
    }
}
