param(
    [Parameter(Mandatory = $true)]
    [string]$Command,
    [string]$Type,
    [string]$Agent,
    [string]$Scope,
    [switch]$Json,
    [Parameter(Mandatory = $true)]
    [string]$RepoRoot,
    [Parameter(Mandatory = $true)]
    [string]$AdapterPath,
    [switch]$BackgroundChild,
    [switch]$Foreground
)

[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
$OutputEncoding = [System.Text.Encoding]::UTF8
$PSDefaultParameterValues['*:Encoding'] = 'utf8'

Get-ChildItem -Path (Join-Path $PSScriptRoot "lib") -Filter "*.ps1" |
    Sort-Object Name |
    ForEach-Object { . $_.FullName }

$resolvedRepoRoot = Resolve-ManagerRepoRoot -RepoRootHint $RepoRoot -WorkingDirectory (Get-Location).Path
$config = Read-ManagerConfig -RepoRoot $resolvedRepoRoot
$remoteMeta = Resolve-RemoteMetadata -RepoRoot $resolvedRepoRoot -PreferredRemote "$($config.preferredRemote)"
$baseBranch = Resolve-BaseBranch -RepoRoot $resolvedRepoRoot -RemoteName $remoteMeta.Name -BaseBranchOverride "$($config.baseBranch)"
$repoKey = Resolve-RepoKey -RepoRoot $resolvedRepoRoot -RemoteUrl $remoteMeta.Url
$diagnosticsDir = if ([string]::IsNullOrWhiteSpace("$($config.diagnosticsDir)")) {
    Join-Path $resolvedRepoRoot ".agent\0. Agents Brain\diagnostics\worktree-manager"
} elseif ([System.IO.Path]::IsPathRooted("$($config.diagnosticsDir)")) {
    "$($config.diagnosticsDir)"
} else {
    Join-Path $resolvedRepoRoot "$($config.diagnosticsDir)"
}
$worktreeRoot = Join-Path "D:\Local Worktrees" $repoKey
$hookPrep = if ([string]::IsNullOrWhiteSpace("$($config.hooks.dependencyPrep)")) { $null } else { Join-Path $resolvedRepoRoot "$($config.hooks.dependencyPrep)" }
$hookShip = if ([string]::IsNullOrWhiteSpace("$($config.hooks.preShip)")) { $null } else { Join-Path $resolvedRepoRoot "$($config.hooks.preShip)" }
$scopeLockFile = Join-Path $resolvedRepoRoot ".agent\worktree-scope-lock.$repoKey.json"
$definitions = Get-FixedMonitorDefinitions -WorktreeRoot $worktreeRoot
$monitorKeys = @()

if ($Command -eq "capabilities") {
    $capabilities = Get-ManagerCapabilities `
        -RepoRoot $resolvedRepoRoot `
        -BaseBranch $baseBranch `
        -WorktreeRoot $worktreeRoot `
        -RepoKey $repoKey `
        -ScopeLockFilePath $scopeLockFile
    Write-ManagerCapabilities -Capabilities $capabilities -Json:$Json
    exit 0
}

$adapter = Resolve-AdapterPath -RepoRoot $resolvedRepoRoot -AdapterPathHint $AdapterPath -Config $config

if ($Command -eq "fixed-list" -or $Command -eq "fixed-ship-all") { $monitorKeys = $definitions.Keys }
if ($Command -eq "fixed-open" -or $Command -eq "fixed-ship") {
    $monitorKey = if ($Type) { $Type } elseif ($Agent) { $Agent } elseif ($Scope) { $Scope } else { "" }
    if (-not [string]::IsNullOrWhiteSpace($monitorKey)) { $monitorKeys = @($monitorKey) }
}

if ($monitorKeys.Count -gt 0) {
    Invoke-FixedMonitorRepair -RepoRoot $resolvedRepoRoot -WorktreeRoot $worktreeRoot -MonitorKeys $monitorKeys -Definitions $definitions
}

if ($Command -in @("ship", "fixed-ship", "fixed-ship-all") -and $adapter.Provider -eq "github" -and $remoteMeta.Provider -ne "github") {
    throw "❌ Ship solo está soportado por el adapter GitHub. Remote actual: $($remoteMeta.Url)"
}

$environmentResult = Get-AdapterEnvironment `
    -RepoRoot $resolvedRepoRoot `
    -WorktreeRoot $worktreeRoot `
    -RepoKey $repoKey `
    -RemoteMeta $remoteMeta `
    -BaseBranch $baseBranch `
    -DiagnosticsDir $diagnosticsDir `
    -HookDependencyPrep $hookPrep `
    -HookPreShip $hookShip

$exitCode = Invoke-AdapterCommand `
    -AdapterPath $adapter.Path `
    -Command $Command `
    -Type $Type `
    -Agent $Agent `
    -Scope $Scope `
    -BackgroundChild:$BackgroundChild `
    -Foreground:$Foreground `
    -EnvironmentResult $environmentResult
exit $exitCode
