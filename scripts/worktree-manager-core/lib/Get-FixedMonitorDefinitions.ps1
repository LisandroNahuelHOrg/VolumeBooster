function Get-FixedMonitorDefinitions {
    param([string]$WorktreeRoot)

    return [ordered]@{
        "izq-arriba" = [pscustomobject]@{
            key = "izq-arriba"; display = "WorktreeIzqArriba"; branch = "monitor-izq-arriba"; path = (Join-Path $WorktreeRoot "WorktreeIzqArriba")
        }
        "der-arriba" = [pscustomobject]@{
            key = "der-arriba"; display = "WorktreeDerArriba"; branch = "monitor-der-arriba"; path = (Join-Path $WorktreeRoot "WorktreeDerArriba")
        }
        "izq-abajo" = [pscustomobject]@{
            key = "izq-abajo"; display = "WorktreeIzqAbajo"; branch = "monitor-izq-abajo"; path = (Join-Path $WorktreeRoot "WorktreeIzqAbajo")
        }
        "der-abajo" = [pscustomobject]@{
            key = "der-abajo"; display = "WorktreeDerAbajo"; branch = "monitor-der-abajo"; path = (Join-Path $WorktreeRoot "WorktreeDerAbajo")
        }
    }
}
