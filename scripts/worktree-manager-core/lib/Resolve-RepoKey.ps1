function Resolve-RepoKey {
    param(
        [string]$RepoRoot,
        [string]$RemoteUrl
    )

    $rawKey = $null
    if ($RemoteUrl -match '^https://github\.com/([^/]+)/([^/.]+)(?:\.git)?$') { $rawKey = "$($Matches[1])__$($Matches[2])" }
    if ($RemoteUrl -match '^git@github\.com:([^/]+)/([^/.]+)(?:\.git)?$') { $rawKey = "$($Matches[1])__$($Matches[2])" }
    if (-not $rawKey -and $RemoteUrl -match '^[a-z]+://([^/]+)/(.+?)(?:\.git)?$') { $rawKey = "$($Matches[1])__$($Matches[2] -replace '[\\/]', '__')" }
    if (-not $rawKey -and $RemoteUrl -match '^[^@]+@([^:]+):(.+?)(?:\.git)?$') { $rawKey = "$($Matches[1])__$($Matches[2] -replace '[\\/]', '__')" }
    if (-not $rawKey) { $rawKey = Split-Path -Leaf $RepoRoot }

    return (($rawKey -replace '[^a-zA-Z0-9._-]', '-') -replace '-{2,}', '-').Trim('-')
}
