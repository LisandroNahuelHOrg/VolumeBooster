function Get-LegacyMonitorPaths {
    param(
        [string]$Display,
        [string]$TargetPath
    )

    return @(
        $TargetPath
        "D:\Local Worktrees\$Display"
        "D:\SpeedSuite-Trees\$Display"
    ) | Where-Object { -not [string]::IsNullOrWhiteSpace($_) } | Select-Object -Unique
}
