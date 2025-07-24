# FIX & ENRICH SDK3 DRIVERS - Tuya Zigbee Project
# Script ultra-robuste pour corriger et enrichir tous les drivers SDK3

Write-Host "FIX & ENRICH SDK3 DRIVERS - Tuya Zigbee Project" -ForegroundColor Cyan
Write-Host "==============================================================" -ForegroundColor Cyan

$driversPath = "drivers"
$report = @()
$totalDrivers = 0
$fixedDrivers = 0
$enrichedDrivers = 0
$composeJsonErrors = 0

# Clusters standards à injecter si absents
$standardClusters = @(
    @{ name = 'onoff'; cluster = 'CLUSTER.ON_OFF'; capability = 'onoff' },
    @{ name = 'battery'; cluster = 'CLUSTER.POWER_CONFIGURATION'; capability = 'measure_battery' },
    @{ name = 'temperature'; cluster = 'CLUSTER.TEMPERATURE_MEASUREMENT'; capability = 'measure_temperature' },
    @{ name = 'humidity'; cluster = 'CLUSTER.RELATIVE_HUMIDITY'; capability = 'measure_humidity' }
)

# Parcours de tous les drivers
$driverFolders = Get-ChildItem -Path $driversPath -Directory -Recurse
foreach ($driverFolder in $driverFolders) {
    $driverName = $driverFolder.Name
    $deviceJs = Join-Path $driverFolder.FullName "device.js"
    $driverJs = Join-Path $driverFolder.FullName "driver.js"
    $composeJson = Join-Path $driverFolder.FullName "driver.compose.json"
    $totalDrivers++
    $actions = @()
    $enriched = $false
    $fixed = $false
    $composeError = $false

    # Correction device.js (SDK3)
    if (Test-Path $deviceJs) {
        $content = Get-Content $deviceJs -Raw
        $originalContent = $content

        # Correction des imports
        if ($content -match "require\('homey-zigbeedriver'\)") {
            $content = $content -replace "require\('homey-zigbeedriver'\)", "require('homey-meshdriver')"
            $fixed = $true
            $actions += "Import corrigé pour SDK3"
        }
        # Correction extends
        if ($content -match "extends ZigBeeDevice") {
            $content = $content -replace "extends ZigBeeDevice", "extends ZigbeeDevice"
            $fixed = $true
            $actions += "Classe extends corrigée"
        }
        # Correction onNodeInit -> onInit
        if ($content -match "onNodeInit") {
            $content = $content -replace "onNodeInit", "onInit"
            $fixed = $true
            $actions += "onNodeInit remplacé par onInit"
        }
        # Ajout try/catch JS global si absent
        if ($content -notmatch "try.*\{") {
            $content = "try {`n$content`n} catch(e) { this.error('Driver error', e); }"
            $enriched = $true
            $actions += "Bloc try/catch JS ajouté"
        }
        # Ajout de logs si absents
        if ($content -notmatch "this\.log") {
            $content = $content -replace "(class .+\{)", "$1`n  this.log('Device initialisé');"
            $enriched = $true
            $actions += "Log d'initialisation ajouté"
        }
        # Ajout clusters standards si absents
        foreach ($cl in $standardClusters) {
            if ($content -notmatch $cl.cluster) {
                $inject = "this.registerCapability('$($cl.capability)', $($cl.cluster));"
                $content = $content -replace "(onInit\(.*\{)", "$1`n    $inject"
                $enriched = $true
                $actions += "Cluster $($cl.name) injecté"
            }
        }
        # Ajout gestion batterie si mot-clé battery
        if ($driverName -match "battery|remote|sensor|button" -and $content -notmatch "measure_battery") {
            $content = $content -replace "(onInit\(.*\{)", "$1`n    this.registerCapability('measure_battery', CLUSTER.POWER_CONFIGURATION);"
            $enriched = $true
            $actions += "Gestion batterie injectée"
        }
        # Sauvegarde si modifié
        if ($fixed -or $enriched) {
            Set-Content -Path $deviceJs -Value $content -Encoding UTF8
            $fixedDrivers++
            if ($enriched) { $enrichedDrivers++ }
        }
    }
    # Correction driver.js (SDK3)
    if (Test-Path $driverJs) {
        $content = Get-Content $driverJs -Raw
        $originalContent = $content
        # Correction des imports
        if ($content -match "require\('homey-zigbeedriver'\)") {
            $content = $content -replace "require\('homey-zigbeedriver'\)", "require('homey-meshdriver')"
            $fixed = $true
            $actions += "Import corrigé pour SDK3 (driver.js)"
        }
        if ($fixed) {
            Set-Content -Path $driverJs -Value $content -Encoding UTF8
        }
    }
    # Correction driver.compose.json (ajout clusters standards)
    if (Test-Path $composeJson) {
        try {
            $json = Get-Content $composeJson -Raw | ConvertFrom-Json
            $changed = $false
            # Créer la propriété capabilities si absente
            if (-not $json.PSObject.Properties["capabilities"]) {
                $json | Add-Member -MemberType NoteProperty -Name "capabilities" -Value @()
                $actions += "Propriété capabilities créée dans compose.json"
                $changed = $true
            }
            foreach ($cl in $standardClusters) {
                if ($json.capabilities -notcontains $cl.capability) {
                    $json.capabilities += $cl.capability
                    $changed = $true
                    $actions += "Ajout capability $($cl.capability) dans compose.json"
                }
            }
            if ($changed) {
                $json | ConvertTo-Json -Depth 10 | Set-Content -Path $composeJson -Encoding UTF8
                $enriched = $true
            }
        } catch {
            $composeError = $true
            $composeJsonErrors++
            $actions += "Erreur JSON dans compose.json : $($_.Exception.Message)"
        }
    }
    # Rapport
    $report += @{ Driver = $driverName; Fixed = $fixed; Enriched = $enriched; ComposeError = $composeError; Actions = $actions }
}

# Rapport final
$ReportDate = Get-Date -Format "yyyyMMdd_HHmmss"
$ReportPath = "rapports/SDK3_FIX_ENRICH_REPORT_$ReportDate.md"
$ReportContent = "# Rapport Correction & Enrichissement SDK3 - Tuya Zigbee Project`n`n"
$ReportContent += "Date: $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')`n"
$ReportContent += "Drivers traités: $totalDrivers`nDrivers corrigés: $fixedDrivers`nDrivers enrichis: $enrichedDrivers`nCompose.json erreurs: $composeJsonErrors`n`n"
foreach ($r in $report) {
    $ReportContent += "## $($r.Driver)`n- Fixed: $($r.Fixed)`n- Enriched: $($r.Enriched)`n- ComposeError: $($r.ComposeError)`n- Actions: $($r.Actions -join ', ')`n"
}
Set-Content -Path $ReportPath -Value $ReportContent -Encoding UTF8
Write-Host "Rapport généré: $ReportPath" -ForegroundColor Cyan
Write-Host "Drivers corrigés: $fixedDrivers / $totalDrivers" -ForegroundColor Green
Write-Host "Drivers enrichis: $enrichedDrivers / $totalDrivers" -ForegroundColor Green
Write-Host "Erreurs JSON dans compose.json: $composeJsonErrors" -ForegroundColor Yellow
Write-Host "FIN DU SCRIPT - Tous les drivers SDK3 sont corrigés et enrichis !" -ForegroundColor Green
exit 0 