function Write-ManagerCapabilities {
    param(
        $Capabilities,
        [switch]$Json
    )

    if ($Json) {
        $Capabilities | ConvertTo-Json -Depth 4 -Compress
        return
    }

    $Capabilities | Format-List
}
