function Resolve-RemoteMetadata {
    param(
        [string]$RepoRoot,
        [string]$PreferredRemote
    )

    $remotes = @((& git -C $RepoRoot remote 2>$null | ForEach-Object { "$_".Trim() }) | Where-Object { $_ })
    if ($remotes.Count -eq 0) { throw "❌ El repositorio no tiene remotes configurados." }

    $remoteName = if ($PreferredRemote -and $remotes -contains $PreferredRemote) { $PreferredRemote } elseif ($remotes -contains "origin") { "origin" } elseif ($remotes.Count -eq 1) { $remotes[0] } else { throw "❌ No se pudo elegir remote automáticamente. Definir 'preferredRemote' en '.agent/worktree-manager.json'." }
    $remoteUrl = (& git -C $RepoRoot config --get "remote.$remoteName.url" 2>$null | Out-String).Trim()
    if ([string]::IsNullOrWhiteSpace($remoteUrl)) { throw "❌ No se pudo resolver la URL del remote '$remoteName'." }

    $provider = "generic"
    $gitHubRepo = $null
    if ($remoteUrl -match '^https://github\.com/([^/]+)/([^/.]+)(?:\.git)?$') { $provider = "github"; $gitHubRepo = "$($Matches[1])/$($Matches[2])" }
    if ($remoteUrl -match '^git@github\.com:([^/]+)/([^/.]+)(?:\.git)?$') { $provider = "github"; $gitHubRepo = "$($Matches[1])/$($Matches[2])" }

    return [pscustomobject]@{
        Name = $remoteName
        Url = $remoteUrl
        Provider = $provider
        GitHubRepo = $gitHubRepo
    }
}
