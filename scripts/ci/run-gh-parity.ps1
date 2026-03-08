<#
.SYNOPSIS
    Runs local CI parity with act over a clean snapshot built from the exact state-to-commit.
#>

[CmdletBinding()]
param(
    [ValidateSet("pull_request", "push", "workflow_dispatch", "merge_group")]
    [string]$Event = "pull_request",
    [string]$Job = "all",
    [bool]$Strict = $true,
    [switch]$KeepSnapshot,
    [switch]$Reuse,
    [switch]$Doctor,
    [ValidateSet("wait", "skip", "fail-fast")]
    [string]$LockMode = "wait",
    [ValidateRange(1, 7200)]
    [int]$LockMaxWaitSeconds = 1800,
    [ValidateRange(1, 60)]
    [int]$LockPollSeconds = 5,
    [ValidateSet("default", "fixed-2", "fixed-3", "adaptive-local")]
    [string]$TierParallelProfile = "default"
)

$ErrorActionPreference = "Stop"
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
$OutputEncoding = [System.Text.Encoding]::UTF8
$PSDefaultParameterValues['*:Encoding'] = 'utf8'

$repoRoot = Resolve-Path (Join-Path $PSScriptRoot "..\..")
$cacheRoot = "D:\SpeedSuite-Cache"
$npmCache = Join-Path $cacheRoot "npm"
$tmpRoot = Join-Path $cacheRoot "tmp"
$npmGlobal = Join-Path $cacheRoot "npm-global"
$actExe = Join-Path $cacheRoot "act-bin\act.exe"
$playwrightCache = Join-Path $cacheRoot "ms-playwright"
$diagRoot = Join-Path $repoRoot ".agent\0. Agents Brain\diagnostics\ci-parity"
$dockerWslPath = "C:\Users\Lisandro\AppData\Local\Docker\wsl"
$dockerExpectedTarget = "D:\DockerData\wsl"
$parityMutexName = "Global\SpeedSuiteCiParityActLock"
$parityMutexTimeoutMs = $LockMaxWaitSeconds * 1000
$parityLockPollMs = $LockPollSeconds * 1000
$parityDefaultMaxConcurrentJobs = 4

function Ensure-Dir([string]$Path) {
    New-Item -ItemType Directory -Force -Path $Path | Out-Null
}

function Ensure-Command([string]$Name) {
    if (-not (Get-Command $Name -ErrorAction SilentlyContinue)) {
        throw "Required command not found in PATH: $Name"
    }
}

function Parse-Major([string]$Value) {
    if ($Value -notmatch '^v?(\d+)') { return -1 }
    return [int]$matches[1]
}

function Normalize-Path([string]$PathValue) {
    return $PathValue.Trim().TrimEnd('\').ToLowerInvariant()
}

function Get-NpmCommand {
    $dDriveNpm = Join-Path $npmGlobal "npm.cmd"
    if (Test-Path $dDriveNpm) {
        return $dDriveNpm
    }
    return "npm"
}

function Get-JunctionTarget($Item) {
    if ($Item.Target -is [array]) {
        return [string]$Item.Target[0]
    }
    return [string]$Item.Target
}

function To-DockerPath([string]$PathValue) {
    return $PathValue -replace '\\', '/'
}

function Invoke-WithParityMutex {
    param([scriptblock]$Action)

    $mutex = New-Object System.Threading.Mutex($false, $parityMutexName)
    $acquired = $false
    try {
        if ($LockMode -eq "fail-fast") {
            $acquired = $mutex.WaitOne(0)
            if (-not $acquired) {
                throw "Parity lock busy: $parityMutexName. Another ci:parity is running. Retry later or use -LockMode skip."
            }
        }
        elseif ($LockMode -eq "skip") {
            $acquired = $mutex.WaitOne(0)
            if (-not $acquired) {
                Write-Warning "Parity lock busy ($parityMutexName). Skipping local parity for this run."
                return $false
            }
        }
        else {
            $deadline = (Get-Date).AddMilliseconds($parityMutexTimeoutMs)
            $nextLogAt = Get-Date
            while (-not $acquired) {
                $remainingMs = [int][Math]::Max(0, ($deadline - (Get-Date)).TotalMilliseconds)
                if ($remainingMs -le 0) {
                    break
                }

                $waitChunkMs = [int][Math]::Min($parityLockPollMs, $remainingMs)
                $acquired = $mutex.WaitOne($waitChunkMs)
                if ($acquired) {
                    break
                }

                if ((Get-Date) -ge $nextLogAt) {
                    $elapsedSec = [int]($LockMaxWaitSeconds - ($remainingMs / 1000))
                    $remainingSec = [int]($remainingMs / 1000)
                    Write-Host "⏳ Waiting parity lock ($elapsedSec s elapsed, $remainingSec s remaining): $parityMutexName"
                    $nextLogAt = (Get-Date).AddSeconds(15)
                }
            }

            if (-not $acquired) {
                throw "Timeout waiting for global parity lock ($LockMaxWaitSeconds s): $parityMutexName"
            }
        }

        & $Action
        return $true
    }
    finally {
        if ($acquired) {
            try { $mutex.ReleaseMutex() } catch {}
        }
        $mutex.Dispose()
    }
}

function Test-IsPortBindError {
    param([object[]]$Lines)

    if (-not $Lines -or $Lines.Count -eq 0) {
        return $false
    }

    $text = (($Lines | ForEach-Object { "$_" }) -join "`n").ToLowerInvariant()
    return (
        $text -match 'address already in use' -or
        $text -match 'only one usage of each socket address' -or
        $text -match 'bind: an attempt was made to access a socket' -or
        $text -match 'listen tcp .*:34567'
    )
}

function Get-TierParallelExecutionProfiles {
    param([string]$ProfileName)

    switch ($ProfileName) {
        "fixed-2" {
            return @(
                [pscustomobject]@{
                    Name              = "fixed-2"
                    CiMaxParallel     = 2
                    CiEnableParallel3 = "false"
                    AllowInfraFallback = $false
                }
            )
        }
        "fixed-3" {
            return @(
                [pscustomobject]@{
                    Name              = "fixed-3"
                    CiMaxParallel     = 3
                    CiEnableParallel3 = "true"
                    AllowInfraFallback = $false
                }
            )
        }
        "adaptive-local" {
            return @(
                [pscustomobject]@{
                    Name              = "adaptive-local:primary"
                    CiMaxParallel     = 8
                    CiEnableParallel3 = "true"
                    AllowInfraFallback = $true
                },
                [pscustomobject]@{
                    Name              = "adaptive-local:fallback-1"
                    CiMaxParallel     = 6
                    CiEnableParallel3 = "true"
                    AllowInfraFallback = $true
                },
                [pscustomobject]@{
                    Name              = "adaptive-local:fallback-2"
                    CiMaxParallel     = 4
                    CiEnableParallel3 = "true"
                    AllowInfraFallback = $false
                }
            )
        }
        default {
            return @(
                [pscustomobject]@{
                    Name              = "default"
                    CiMaxParallel     = $null
                    CiEnableParallel3 = $null
                    AllowInfraFallback = $false
                }
            )
        }
    }
}

function Test-IsInfraResourceError {
    param(
        [object[]]$Lines,
        [int]$ExitCode = 0
    )

    if (Test-IsPortBindError -Lines $Lines) {
        return $true
    }
    if ($ExitCode -eq 137) {
        return $true
    }

    if (-not $Lines -or $Lines.Count -eq 0) {
        return $false
    }

    $text = (($Lines | ForEach-Object { "$_" }) -join "`n").ToLowerInvariant()
    $infraPatterns = @(
        'out of memory',
        'oom',
        'enomem',
        'cannot allocate memory',
        'killed process',
        'signal: killed',
        'exit code 137',
        'code 137',
        'resource temporarily unavailable',
        'too many open files',
        'no space left on device',
        'fork: retry',
        'cannot create worker thread',
        'failed to create thread'
    )

    foreach ($pattern in $infraPatterns) {
        if ($text -match [regex]::Escape($pattern)) {
            return $true
        }
    }

    return $false
}

function Get-FreeTcpPort {
    $listener = [System.Net.Sockets.TcpListener]::new([System.Net.IPAddress]::Loopback, 0)
    try {
        $listener.Start()
        return $listener.LocalEndpoint.Port
    }
    finally {
        $listener.Stop()
    }
}

function Run-Doctor {
    Ensure-Command "git"
    Ensure-Command "node"
    Ensure-Command "docker"

    Ensure-Dir $cacheRoot
    Ensure-Dir $npmCache
    Ensure-Dir $tmpRoot
    Ensure-Dir $npmGlobal
    Ensure-Dir $playwrightCache
    Ensure-Dir $diagRoot
    Ensure-Dir (Join-Path $repoRoot ".act")
    Ensure-Dir (Join-Path $repoRoot ".act\cache")
    Ensure-Dir (Join-Path $repoRoot ".act\actions")
    Ensure-Dir (Join-Path $repoRoot ".act\artifacts")

    if (-not (Test-Path $actExe)) {
        throw "act binary was not found at $actExe. Run npm run ci:parity:install"
    }

    $nodeMajor = Parse-Major ((& node -v).Trim())
    if ($nodeMajor -ne 24) {
        throw "Node major must be 24 for parity. Current: $nodeMajor"
    }

    $npmCmd = Get-NpmCommand
    if ($npmCmd -eq "npm") {
        Ensure-Command "npm"
    }
    $npmVersion = (& $npmCmd -v).Trim()
    $npmMajor = Parse-Major $npmVersion
    if ($npmMajor -ne 11) {
        throw "npm major must be 11 for parity. Current: $npmVersion. Run npm run ci:parity:install"
    }

    $dockerServerVersion = (& docker version --format '{{.Server.Version}}' 2>$null).Trim()
    if (-not $dockerServerVersion) {
        throw "Docker server is not available."
    }

    if (-not (Test-Path $dockerWslPath)) {
        throw "Docker WSL path not found: $dockerWslPath"
    }
    $dockerWslItem = Get-Item $dockerWslPath -Force
    $actualTarget = Normalize-Path (Get-JunctionTarget $dockerWslItem)
    $expectedTarget = Normalize-Path $dockerExpectedTarget
    if ($dockerWslItem.LinkType -ne "Junction" -or $actualTarget -ne $expectedTarget) {
        throw "Docker data is not redirected to D:. Expected Junction -> $dockerExpectedTarget"
    }

    Write-Host "Doctor OK:"
    Write-Host " - node: $((& node -v).Trim())"
    Write-Host " - npm: $npmVersion ($npmCmd)"
    Write-Host " - docker server: $dockerServerVersion"
    Write-Host " - act: $((& $actExe --version | Select-Object -First 1))"
    Write-Host " - docker data junction: $dockerWslPath -> $(Get-JunctionTarget $dockerWslItem)"
    Write-Host " - cache root: $cacheRoot"
}

if ($Doctor) {
    try {
        Run-Doctor
        exit 0
    }
    catch {
        Write-Error $_
        exit 10
    }
}

try {
    Write-Host "Parity lock policy: mode=$LockMode maxWait=$LockMaxWaitSeconds poll=$LockPollSeconds"
    Write-Host "Tier parallel profile: $TierParallelProfile"

    Run-Doctor
}
catch {
    Write-Error $_
    exit 10
}

if (($Job -eq "all" -or [string]::IsNullOrWhiteSpace($Job)) -and $env:npm_config_job) {
    $Job = $env:npm_config_job
}

$runId = (Get-Date -Format "yyyyMMdd-HHmmss") + "-" + [Guid]::NewGuid().ToString("N").Substring(0, 8)
$runRoot = Join-Path $tmpRoot ("parity-" + $runId)
$snapshotDir = Join-Path $runRoot "snapshot"
$indexFile = Join-Path $runRoot "parity.index"
$runTemp = Join-Path $runRoot "tmp"
$logFile = Join-Path $diagRoot ("parity-" + $runId + ".log")
$artifactPath = Join-Path $runRoot "artifacts"

Ensure-Dir $runRoot
Ensure-Dir $runTemp
Ensure-Dir $diagRoot
Ensure-Dir $artifactPath

$oldNpmCache = $env:NPM_CONFIG_CACHE
$oldNpmPrefix = $env:NPM_CONFIG_PREFIX
$oldTemp = $env:TEMP
$oldTmp = $env:TMP
$oldGitIndex = $env:GIT_INDEX_FILE
$oldPath = $env:PATH

$actExit = 0
$snapshotAttached = $false
$parityFilesJson = "[]"
$parityLocChanged = 0

try {
    $env:NPM_CONFIG_CACHE = $npmCache
    $env:NPM_CONFIG_PREFIX = $npmGlobal
    $env:TEMP = $runTemp
    $env:TMP = $runTemp
    $env:PATH = "$npmGlobal;$env:PATH"

    Push-Location $repoRoot
    try {
        $env:GIT_INDEX_FILE = $indexFile
        git read-tree HEAD | Out-Null
        if ($LASTEXITCODE -ne 0) { throw "git read-tree HEAD failed." }

        git add -A | Out-Null
        if ($LASTEXITCODE -ne 0) { throw "git add -A failed." }

        $tree = (git write-tree).Trim()
        if ($LASTEXITCODE -ne 0 -or [string]::IsNullOrWhiteSpace($tree)) {
            throw "git write-tree failed."
        }

        $snapshotCommit = (git commit-tree $tree -p HEAD -m "ci parity snapshot").Trim()
        if ($LASTEXITCODE -ne 0 -or [string]::IsNullOrWhiteSpace($snapshotCommit)) {
            throw "git commit-tree failed."
        }

        $parityDiffRange = @("HEAD", $snapshotCommit)
        $diffNamesRaw = (& git diff --name-only --diff-filter=ACMR @parityDiffRange)
        if ($LASTEXITCODE -ne 0) {
            throw "git diff --name-only failed."
        }
        $diffFiles = @()
        if ($diffNamesRaw) {
            $diffFiles = $diffNamesRaw -split "`r?`n" | ForEach-Object { $_.Trim() } | Where-Object { $_ }
        }

        if ($diffFiles.Count -eq 0) {
            $headParent = (& git rev-parse --verify HEAD^ 2>$null).Trim()
            if ($LASTEXITCODE -eq 0 -and -not [string]::IsNullOrWhiteSpace($headParent)) {
                Write-Host "No uncommitted diff detected; using HEAD^..HEAD for parity metadata."
                $parityDiffRange = @("HEAD^", "HEAD")
                $diffNamesRaw = (& git diff --name-only --diff-filter=ACMR @parityDiffRange)
                if ($LASTEXITCODE -ne 0) {
                    throw "git diff --name-only HEAD^ HEAD failed."
                }
                if ($diffNamesRaw) {
                    $diffFiles = $diffNamesRaw -split "`r?`n" | ForEach-Object { $_.Trim() } | Where-Object { $_ }
                }
            }
        }

        $parityFilesJson = ConvertTo-Json -Compress -InputObject @($diffFiles)
        if ([string]::IsNullOrWhiteSpace($parityFilesJson)) {
            $parityFilesJson = "[]"
        }

        $diffNumstatRaw = (& git diff --numstat --diff-filter=ACMR @parityDiffRange)
        if ($LASTEXITCODE -ne 0) {
            throw "git diff --numstat failed."
        }
        $parityLocChanged = 0
        if ($diffNumstatRaw) {
            foreach ($line in ($diffNumstatRaw -split "`r?`n")) {
                if ([string]::IsNullOrWhiteSpace($line)) { continue }
                $parts = $line -split "`t"
                if ($parts.Count -lt 2) {
                    $parts = $line -split "\s+"
                }
                if ($parts.Count -lt 2) { continue }
                if ($parts[0] -match '^\d+$') { $parityLocChanged += [int]$parts[0] }
                if ($parts[1] -match '^\d+$') { $parityLocChanged += [int]$parts[1] }
            }
        }

        git -c advice.detachedHead=false worktree add --detach $snapshotDir $snapshotCommit 2>$null
        if ($LASTEXITCODE -ne 0) {
            throw "git worktree add failed for $snapshotDir"
        }
        $snapshotAttached = $true
    }
    finally {
        if ($null -eq $oldGitIndex) { Remove-Item Env:GIT_INDEX_FILE -ErrorAction SilentlyContinue } else { $env:GIT_INDEX_FILE = $oldGitIndex }
        Pop-Location
    }

    Push-Location $snapshotDir
    try {
        $dockerNpmCache = To-DockerPath $npmCache
        $dockerPlaywrightCache = To-DockerPath $playwrightCache
        $containerOptions = "-v ${dockerNpmCache}:/github/home/.npm -v ${dockerPlaywrightCache}:/github/home/.cache/ms-playwright"
        $tierProfiles = Get-TierParallelExecutionProfiles -ProfileName $TierParallelProfile
        $parityRan = Invoke-WithParityMutex {
            $maxAttempts = 3
            $profileIndex = 0
            foreach ($tierProfile in $tierProfiles) {
                $profileIndex++
                $profileLabel = "$($tierProfile.Name)"
                $profileExit = 0
                $lastActOutput = @()

                if ($null -ne $tierProfile.CiMaxParallel) {
                    Write-Host "Using tier profile '$profileLabel' (CI_MAX_PARALLEL=$($tierProfile.CiMaxParallel), CI_ENABLE_PARALLEL_3=$($tierProfile.CiEnableParallel3))."
                }
                else {
                    Write-Host "Using tier profile '$profileLabel' (workflow defaults)."
                }

                for ($attempt = 1; $attempt -le $maxAttempts; $attempt++) {
                    $artifactServerPort = Get-FreeTcpPort
                    $cacheServerPort = Get-FreeTcpPort
                    $actArgs = @(
                        $Event,
                        "-W", ".github/workflows/verify.yml",
                        "--bind",
                        "--artifact-server-path", $artifactPath,
                        "--artifact-server-port", "$artifactServerPort",
                        "--cache-server-port", "$cacheServerPort",
                        "--concurrent-jobs", "$parityDefaultMaxConcurrentJobs",
                        "--env", "CI=true",
                        "--env", "ACT=true",
                        "--env", "TZ=UTC",
                        "--env", "LANG=C.UTF-8",
                        "--env", "LC_ALL=C.UTF-8",
                        "--env", "PARITY_FILES_CHANGED_JSON=$parityFilesJson",
                        "--env", "PARITY_LOC_CHANGED=$parityLocChanged",
                        "--container-options", $containerOptions
                    )

                    if ($null -ne $tierProfile.CiMaxParallel) {
                        $actArgs += @("--env", "CI_MAX_PARALLEL=$($tierProfile.CiMaxParallel)")
                    }
                    if ($null -ne $tierProfile.CiEnableParallel3) {
                        $actArgs += @("--env", "CI_ENABLE_PARALLEL_3=$($tierProfile.CiEnableParallel3)")
                    }

                    if ($Job -and $Job -ne "all") {
                        $actArgs += @("--job", $Job)
                    }

                    if (-not $Strict -and $Reuse) {
                        $actArgs += "--reuse"
                    }

                    "=== act profile $profileLabel attempt $attempt/$maxAttempts ===" | Tee-Object -FilePath $logFile -Append | Out-Null
                    Write-Host "Using parity artifact/cache ports: artifact=$artifactServerPort cache=$cacheServerPort"
                    Write-Host "Running parity (profile=$profileLabel attempt $attempt/$maxAttempts): $actExe $($actArgs -join ' ')"
                    $actOutput = & $actExe @actArgs *>&1
                    $actOutput | Tee-Object -FilePath $logFile -Append
                    $profileExit = $LASTEXITCODE
                    $actExit = $profileExit
                    $lastActOutput = @($actOutput)

                    if ($profileExit -eq 0) {
                        break
                    }

                    $isPortBindError = Test-IsPortBindError -Lines $actOutput
                    if ($isPortBindError -and $attempt -lt $maxAttempts) {
                        Write-Warning "Transient port bind conflict detected in act (profile=$profileLabel attempt=$attempt). Retrying..."
                        Start-Sleep -Seconds 3
                        continue
                    }

                    break
                }

                if ($profileExit -eq 0) {
                    break
                }

                $hasNextProfile = $profileIndex -lt $tierProfiles.Count
                $canFallback = $hasNextProfile -and $tierProfile.AllowInfraFallback
                if ($canFallback) {
                    $isInfraFailure = Test-IsInfraResourceError -Lines $lastActOutput -ExitCode $profileExit
                    if ($isInfraFailure) {
                        Write-Warning "Infra/resource failure detected under profile '$profileLabel'. Falling back to next profile."
                        continue
                    }
                }

                break
            }
        }

        if (-not $parityRan) {
            $actExit = 0
            "Parity skipped because lock is currently busy." | Tee-Object -FilePath $logFile -Append | Out-Null
        }
    }
    finally {
        Pop-Location
    }
}
catch {
    Write-Error $_
    exit 20
}
finally {
    if ($null -eq $oldNpmCache) { Remove-Item Env:NPM_CONFIG_CACHE -ErrorAction SilentlyContinue } else { $env:NPM_CONFIG_CACHE = $oldNpmCache }
    if ($null -eq $oldNpmPrefix) { Remove-Item Env:NPM_CONFIG_PREFIX -ErrorAction SilentlyContinue } else { $env:NPM_CONFIG_PREFIX = $oldNpmPrefix }
    if ($null -eq $oldTemp) { Remove-Item Env:TEMP -ErrorAction SilentlyContinue } else { $env:TEMP = $oldTemp }
    if ($null -eq $oldTmp) { Remove-Item Env:TMP -ErrorAction SilentlyContinue } else { $env:TMP = $oldTmp }
    if ($null -eq $oldGitIndex) { Remove-Item Env:GIT_INDEX_FILE -ErrorAction SilentlyContinue } else { $env:GIT_INDEX_FILE = $oldGitIndex }
    if ($null -eq $oldPath) { Remove-Item Env:PATH -ErrorAction SilentlyContinue } else { $env:PATH = $oldPath }

    if ($snapshotAttached -and -not $KeepSnapshot) {
        Push-Location $repoRoot
        try {
            git worktree remove $snapshotDir --force | Out-Null
        }
        catch {
            Write-Warning "Failed to remove temporary snapshot worktree cleanly: $snapshotDir"
        }
        finally {
            Pop-Location
        }
    }

    if (-not $KeepSnapshot -and (Test-Path $runRoot)) {
        Remove-Item -Recurse -Force $runRoot -ErrorAction SilentlyContinue
    }
}

if ($actExit -ne 0 -and $Strict) {
    Write-Host "Parity failed (exit=$actExit). Log: $logFile"
    exit 30
}

if ($KeepSnapshot) {
    Write-Host "Snapshot retained at: $runRoot"
}
Write-Host "Parity completed (exit=$actExit). Log: $logFile"
exit 0
