function Try-ResolveManagerRemoteContext {
    param(
        [string]$RepoRoot,
        $Config,
        [switch]$Required
    )

    try {
        $remoteMeta = Resolve-RemoteMetadata -RepoRoot $RepoRoot -PreferredRemote "$($Config.preferredRemote)"
        $baseBranch = Resolve-BaseBranch -RepoRoot $RepoRoot -RemoteName $remoteMeta.Name -BaseBranchOverride "$($Config.baseBranch)"
        $repoKey = Resolve-RepoKey -RepoRoot $RepoRoot -RemoteUrl $remoteMeta.Url

        return [pscustomobject]@{
            RemoteMeta = $remoteMeta
            BaseBranch = $baseBranch
            RepoKey    = $repoKey
        }
    }
    catch {
        if ($Required) {
            throw
        }

        return $null
    }
}
