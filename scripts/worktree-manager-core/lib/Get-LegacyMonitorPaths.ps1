function Get-LegacyMonitorPaths {
    param(
        [string]$Display,
        [string]$TargetPath
    )

    $paths = @($TargetPath)
    if ($IsWindows) {
        $paths += "D:\Local Worktrees\$Display"
        $paths += "D:\SpeedSuite-Trees\$Display"
    }

    return $paths | Where-Object { -not [string]::IsNullOrWhiteSpace($_) } | Select-Object -Unique
}
