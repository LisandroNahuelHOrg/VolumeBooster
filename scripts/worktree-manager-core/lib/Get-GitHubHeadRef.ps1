function Get-GitHubHeadRef {
    param(
        [Parameter(Mandatory = $true)]
        [string]$RepoRef,
        [Parameter(Mandatory = $true)]
        [string]$BranchName
    )

    $owner = @("$RepoRef".Trim().Split("/"))[0]
    if ([string]::IsNullOrWhiteSpace($owner)) {
        throw "❌ No se pudo resolver owner GitHub desde '$RepoRef'."
    }

    return ("{0}:{1}" -f $owner, $BranchName)
}
