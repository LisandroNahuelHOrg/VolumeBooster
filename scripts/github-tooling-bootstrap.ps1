<#
.SYNOPSIS
    Detects whether GitHub operations should use gh CLI or MCP, and auto-recovers gh auth when possible.

.DESCRIPTION
    1) Checks if gh CLI is installed and already authenticated.
    2) If gh auth is invalid, switches deterministically to MCP fallback mode.
    3) Emits a machine-readable JSON result so agents can route to gh or MCP deterministically.

    This script never prints tokens and never persists secrets to files.
#>

[CmdletBinding()]
param(
    [string]$RepoPath = (Get-Location).Path,
    [switch]$RequireGh,
    [switch]$Json
)

[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
$OutputEncoding = [System.Text.Encoding]::UTF8
$PSDefaultParameterValues['*:Encoding'] = 'utf8'

$ErrorActionPreference = "Stop"

function Parse-RemoteInfo {
    param([string]$RemoteUrl)

    $remoteHost = "github.com"
    $path = ""
    $owner = ""
    $repo = ""

    if ($RemoteUrl -match '^https?://([^/]+)/(.+)$') {
        $remoteHost = $matches[1]
        $path = $matches[2]
    }
    elseif ($RemoteUrl -match '^git@([^:]+):(.+)$') {
        $remoteHost = $matches[1]
        $path = $matches[2]
    }

    if ($path) {
        $trimmed = $path.Trim('/')
        if (-not $trimmed.EndsWith('.git')) {
            $trimmed = "$trimmed.git"
        }
        $path = $trimmed
    }

    if ($path -match '^([^/]+)/([^/]+?)(\.git)?$') {
        $owner = $matches[1]
        $repo = $matches[2]
    }

    return [PSCustomObject]@{
        host  = $remoteHost
        path  = $path
        owner = $owner
        repo  = $repo
    }
}

function Test-GhAuth {
    param(
        [string]$Token = ""
    )

    if (-not (Get-Command gh -ErrorAction SilentlyContinue)) {
        return [PSCustomObject]@{
            ok    = $false
            login = ""
            error = "gh-not-installed"
        }
    }

    $previousToken = if (Test-Path Env:GH_TOKEN) { $env:GH_TOKEN } else { $null }
    $hadPreviousToken = Test-Path Env:GH_TOKEN
    if ($Token) {
        $env:GH_TOKEN = $Token
    }
    $env:GH_PROMPT_DISABLED = "1"

    $login = ""
    try {
        $login = gh api user --jq .login 2>$null
        if ($LASTEXITCODE -eq 0 -and $login) {
            return [PSCustomObject]@{
                ok    = $true
                login = "$login".Trim()
                error = ""
            }
        }
    }
    catch {
    }
    finally {
        if ($Token) {
            if ($hadPreviousToken) {
                $env:GH_TOKEN = $previousToken
            }
            else {
                Remove-Item Env:GH_TOKEN -ErrorAction SilentlyContinue
            }
        }
    }

    return [PSCustomObject]@{
        ok    = $false
        login = ""
        error = "gh-auth-invalid"
    }
}

function Emit-Result {
    param(
        [string]$Mode,
        [string]$Reason,
        [string]$RemoteHost,
        [string]$Path,
        [string]$Owner,
        [string]$Repo,
        [string]$GhUser
    )

    $result = [PSCustomObject]@{
        mode                     = $Mode
        reason                   = $Reason
        gh_user                  = $GhUser
        remote_host              = $RemoteHost
        remote_path              = $Path
        repo_owner               = $Owner
        repo_name                = $Repo
        recommended_ci_check_gh  = if ($Owner -and $Repo) { "gh pr checks <numero> --repo $Owner/$Repo" } else { "gh pr checks <numero>" }
        recommended_ci_check_mcp = "mcp_github_get_pull_request_status"
        timestamp_utc            = (Get-Date).ToUniversalTime().ToString("yyyy-MM-ddTHH:mm:ssZ")
    }

    if ($Json) {
        $result | ConvertTo-Json -Depth 4 -Compress
    }
    else {
        Write-Host ""
        Write-Host "GitHub tooling mode: $($result.mode)"
        Write-Host "Reason: $($result.reason)"
        if ($result.gh_user) { Write-Host "gh user: $($result.gh_user)" }
        if ($result.repo_owner -and $result.repo_name) {
            Write-Host "Repo: $($result.repo_owner)/$($result.repo_name)"
        }
        Write-Host "Suggested gh check:  $($result.recommended_ci_check_gh)"
        Write-Host "Suggested MCP check: $($result.recommended_ci_check_mcp)"
        Write-Host ""
    }
}

Push-Location $RepoPath
try {
    $remoteUrl = ""
    try {
        $remoteUrl = (git remote get-url origin 2>$null | Select-Object -First 1)
    }
    catch {
        $remoteUrl = ""
    }

    $remote = Parse-RemoteInfo -RemoteUrl $remoteUrl

    $ghState = Test-GhAuth
    if ($ghState.ok) {
        Emit-Result -Mode "gh" -Reason "gh auth is already valid." `
            -RemoteHost $remote.host -Path $remote.path -Owner $remote.owner -Repo $remote.repo -GhUser $ghState.login
        exit 0
    }

    $reason = "gh unavailable/auth invalid; fallback to MCP GitHub tools. Re-auth with 'gh auth login -h github.com'."
    Emit-Result -Mode "mcp" -Reason $reason `
        -RemoteHost $remote.host -Path $remote.path -Owner $remote.owner -Repo $remote.repo -GhUser ""

    if ($RequireGh) {
        exit 1
    }

    exit 0
}
finally {
    Pop-Location
}
