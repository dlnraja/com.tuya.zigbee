# ============================================================================
# EXTRACT_ALL_MANUFACTURER_IDS.ps1
# ============================================================================
# Description: Extract all manufacturer IDs from drivers
# Author: Universal Tuya Zigbee Project
# Version: 1.0.0
# ============================================================================

$projectRoot = Split-Path -Parent $PSScriptRoot
$driversPath = Join-Path $projectRoot "drivers"
$timestamp = Get-Date -Format "yyyyMMdd_HHmmss"
$reportPath = Join-Path $PSScriptRoot "ALL_MANUFACTURER_IDS_$timestamp.json"

Write-Host "`n🔍 Extraction des Manufacturer IDs...`n" -ForegroundColor Cyan

$allIds = @{
    _TZ3000 = @{}
    _TZE200 = @{}
    _TZE204 = @{}
    _TZE284 = @{}
    other = @{}
}

$driverFiles = Get-ChildItem -Path $driversPath -Recurse -Filter "driver.compose.json"

foreach ($file in $driverFiles) {
    $driverName = Split-Path (Split-Path $file.FullName -Parent) -Leaf
    
    try {
        $content = Get-Content $file.FullName -Raw | ConvertFrom-Json
        
        if ($content.zigbee -and $content.zigbee.manufacturerName) {
            foreach ($id in $content.zigbee.manufacturerName) {
                $category = "other"
                
                if ($id -match "^_TZ3000_") { $category = "_TZ3000" }
                elseif ($id -match "^_TZE200_") { $category = "_TZE200" }
                elseif ($id -match "^_TZE204_") { $category = "_TZE204" }
                elseif ($id -match "^_TZE284_") { $category = "_TZE284" }
                
                if (-not $allIds[$category].ContainsKey($id)) {
                    $allIds[$category][$id] = @()
                }
                
                if ($allIds[$category][$id] -notcontains $driverName) {
                    $allIds[$category][$id] += $driverName
                }
            }
        }
    }
    catch {
        Write-Host "❌ Erreur lecture: $($file.Name)" -ForegroundColor Red
    }
}

# Display statistics
Write-Host "📊 Statistiques par catégorie:`n" -ForegroundColor Yellow

foreach ($category in @("_TZ3000", "_TZE200", "_TZE204", "_TZE284")) {
    $count = $allIds[$category].Count
    $color = if ($count -gt 0) { "Green" } else { "Gray" }
    Write-Host "  $category : $count IDs" -ForegroundColor $color
}

Write-Host "`n🔍 Focus _TZE204_ et _TZE284_:`n" -ForegroundColor Cyan

if ($allIds["_TZE204"].Count -gt 0) {
    Write-Host "📋 _TZE204_ IDs trouvés:" -ForegroundColor Yellow
    $allIds["_TZE204"].Keys | Sort-Object | ForEach-Object {
        $drivers = $allIds["_TZE204"][$_] -join ", "
        Write-Host "  • $_" -ForegroundColor White
        Write-Host "    Drivers: $drivers" -ForegroundColor Gray
    }
}

Write-Host ""

if ($allIds["_TZE284"].Count -gt 0) {
    Write-Host "📋 _TZE284_ IDs trouvés:" -ForegroundColor Green
    $allIds["_TZE284"].Keys | Sort-Object | ForEach-Object {
        $drivers = $allIds["_TZE284"][$_] -join ", "
        Write-Host "  • $_" -ForegroundColor White
        Write-Host "    Drivers: $drivers" -ForegroundColor Gray
    }
}

# Create mapping suggestions
Write-Host "`n🎯 Analyse de mapping _TZE204_ → _TZE284_:`n" -ForegroundColor Cyan

$tze204List = $allIds["_TZE204"].Keys | Sort-Object
$tze284List = $allIds["_TZE284"].Keys | Sort-Object

Write-Host "  Total _TZE204_: $($tze204List.Count)" -ForegroundColor Yellow
Write-Host "  Total _TZE284_: $($tze284List.Count)" -ForegroundColor Green
Write-Host "  Gap: $($tze204List.Count - $tze284List.Count) variants potentiels`n" -ForegroundColor Red

# Export report
$report = @{
    metadata = @{
        generated_at = (Get-Date).ToString("yyyy-MM-dd HH:mm:ss")
        total_drivers = $driverFiles.Count
        total_ids = ($allIds["_TZ3000"].Count + $allIds["_TZE200"].Count + $allIds["_TZE204"].Count + $allIds["_TZE284"].Count)
    }
    statistics = @{
        _TZ3000_count = $allIds["_TZ3000"].Count
        _TZE200_count = $allIds["_TZE200"].Count
        _TZE204_count = $allIds["_TZE204"].Count
        _TZE284_count = $allIds["_TZE284"].Count
    }
    ids = $allIds
    tze204_list = $tze204List
    tze284_list = $tze284List
}

$report | ConvertTo-Json -Depth 10 | Out-File $reportPath -Encoding UTF8
Write-Host "✅ Rapport exporté: $reportPath`n" -ForegroundColor Green
