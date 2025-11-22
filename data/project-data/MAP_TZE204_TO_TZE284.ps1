# ============================================================================
# MAP_TZE204_TO_TZE284.ps1
# ============================================================================
# Description: Systematic mapping of _TZE204_ to _TZE284_ variants
# Author: Universal Tuya Zigbee Project
# Version: 1.0.0
# Date: 2025-01-15
# ============================================================================

param(
    [switch]$ExportReport = $true,
    [switch]$Verbose = $false
)

$ErrorActionPreference = "Continue"
$projectRoot = Split-Path -Parent $PSScriptRoot
$driversPath = Join-Path $projectRoot "drivers"
$timestamp = Get-Date -Format "yyyyMMdd_HHmmss"
$reportPath = Join-Path $PSScriptRoot "TZE204_TO_TZE284_MAPPING_$timestamp.json"

Write-Host "`n╔════════════════════════════════════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "║         MAPPING SYSTÉMATIQUE _TZE204_ → _TZE284_                   ║" -ForegroundColor Cyan
Write-Host "╚════════════════════════════════════════════════════════════════════╝`n" -ForegroundColor Cyan

# Extract all _TZE204_ manufacturer IDs
Write-Host "🔍 Extraction des manufacturer IDs _TZE204_..." -ForegroundColor Yellow

$tze204List = @{}
$driverFiles = Get-ChildItem -Path $driversPath -Recurse -Filter "driver.compose.json"

foreach ($file in $driverFiles) {
    $driverName = Split-Path (Split-Path $file.FullName -Parent) -Leaf
    $content = Get-Content $file.FullName -Raw | ConvertFrom-Json
    
    if ($content.id) {
        foreach ($id in $content.id) {
            if ($id -match "_TZE204_\w+") {
                if (-not $tze204List.ContainsKey($id)) {
                    $tze204List[$id] = @()
                }
                $tze204List[$id] += $driverName
            }
        }
    }
}

Write-Host "✅ Trouvé $($tze204List.Count) manufacturer IDs _TZE204_ uniques`n" -ForegroundColor Green

# Known _TZE284_ variants from database and drivers
Write-Host "🔍 Extraction des manufacturer IDs _TZE284_ existants..." -ForegroundColor Yellow

$tze284Existing = @{}
foreach ($file in $driverFiles) {
    $driverName = Split-Path (Split-Path $file.FullName -Parent) -Leaf
    $content = Get-Content $file.FullName -Raw | ConvertFrom-Json
    
    if ($content.id) {
        foreach ($id in $content.id) {
            if ($id -match "_TZE284_\w+") {
                if (-not $tze284Existing.ContainsKey($id)) {
                    $tze284Existing[$id] = @()
                }
                $tze284Existing[$id] += $driverName
            }
        }
    }
}

Write-Host "✅ Trouvé $($tze284Existing.Count) manufacturer IDs _TZE284_ déjà présents`n" -ForegroundColor Green

# Create mapping suggestions
Write-Host "🧠 Création des suggestions de mapping..." -ForegroundColor Yellow

$mappingSuggestions = @{
    existing_tze204 = @()
    existing_tze284 = @()
    potential_missing = @()
    driver_categories = @{}
}

# Group by driver category
$categoryMap = @{}
foreach ($tze204 in $tze204List.Keys) {
    foreach ($driver in $tze204List[$tze204]) {
        $category = $driver -replace '_battery|_ac|_cr2032|_usb', ''
        if (-not $categoryMap.ContainsKey($category)) {
            $categoryMap[$category] = @{
                tze204_ids = @()
                tze284_ids = @()
                drivers = @()
            }
        }
        if ($categoryMap[$category].tze204_ids -notcontains $tze204) {
            $categoryMap[$category].tze204_ids += $tze204
        }
        if ($categoryMap[$category].drivers -notcontains $driver) {
            $categoryMap[$category].drivers += $driver
        }
    }
}

foreach ($tze284 in $tze284Existing.Keys) {
    foreach ($driver in $tze284Existing[$tze284]) {
        $category = $driver -replace '_battery|_ac|_cr2032|_usb', ''
        if ($categoryMap.ContainsKey($category)) {
            if ($categoryMap[$category].tze284_ids -notcontains $tze284) {
                $categoryMap[$category].tze284_ids += $tze284
            }
        }
    }
}

# Build report structure
foreach ($category in $categoryMap.Keys | Sort-Object) {
    $data = $categoryMap[$category]
    $mappingSuggestions.driver_categories[$category] = @{
        drivers = $data.drivers
        tze204_count = $data.tze204_ids.Count
        tze284_count = $data.tze284_ids.Count
        tze204_ids = $data.tze204_ids | Sort-Object
        tze284_ids = $data.tze284_ids | Sort-Object
        coverage_ratio = if ($data.tze204_ids.Count -gt 0) { 
            [math]::Round(($data.tze284_ids.Count / $data.tze204_ids.Count) * 100, 1) 
        } else { 0 }
    }
    
    # Add to existing lists
    foreach ($id in $data.tze204_ids) {
        $mappingSuggestions.existing_tze204 += @{
            id = $id
            category = $category
            drivers = $tze204List[$id]
        }
    }
    
    foreach ($id in $data.tze284_ids) {
        $mappingSuggestions.existing_tze284 += @{
            id = $id
            category = $category
            drivers = $tze284Existing[$id]
        }
    }
}

# Identify potential missing _TZE284_ variants
Write-Host "`n🔍 Identification des variants _TZE284_ potentiellement manquants...`n" -ForegroundColor Yellow

$priorityCategories = @(
    "motion_sensor",
    "temperature_humidity_sensor",
    "smart_plug",
    "dimmer_switch",
    "radar",
    "presence_sensor",
    "gas_sensor"
)

foreach ($category in $priorityCategories) {
    if ($categoryMap.ContainsKey($category)) {
        $data = $categoryMap[$category]
        Write-Host "📊 $category" -ForegroundColor Cyan
        Write-Host "   _TZE204_: $($data.tze204_ids.Count) IDs" -ForegroundColor White
        Write-Host "   _TZE284_: $($data.tze284_ids.Count) IDs" -ForegroundColor White
        Write-Host "   Coverage: $($mappingSuggestions.driver_categories[$category].coverage_ratio)%" -ForegroundColor $(
            if ($mappingSuggestions.driver_categories[$category].coverage_ratio -ge 50) { "Green" }
            elseif ($mappingSuggestions.driver_categories[$category].coverage_ratio -ge 25) { "Yellow" }
            else { "Red" }
        )
        
        if ($data.tze204_ids.Count -gt $data.tze284_ids.Count) {
            $missing_count = $data.tze204_ids.Count - $data.tze284_ids.Count
            Write-Host "   ⚠️  Potentially $missing_count _TZE284_ variants missing" -ForegroundColor Red
            
            # Sample some IDs to search
            $sample_ids = $data.tze204_ids | Select-Object -First 3
            foreach ($id in $sample_ids) {
                $suffix = $id -replace '_TZE204_', ''
                $potential_tze284 = "_TZE284_$suffix"
                
                $mappingSuggestions.potential_missing += @{
                    tze204_id = $id
                    potential_tze284_id = $potential_tze284
                    category = $category
                    drivers = $tze204List[$id]
                    search_priority = "HIGH"
                    search_urls = @(
                        "https://www.zigbee2mqtt.io/devices/$potential_tze284.html",
                        "https://github.com/Koenkk/zigbee2mqtt/search?q=$potential_tze284",
                        "https://www.aliexpress.com/w/wholesale-$potential_tze284.html"
                    )
                }
            }
        }
        Write-Host ""
    }
}

# Export report
if ($ExportReport) {
    Write-Host "💾 Export du rapport..." -ForegroundColor Yellow
    
    $report = @{
        metadata = @{
            generated_at = (Get-Date).ToString("yyyy-MM-dd HH:mm:ss")
            project_version = "2.15.96"
            total_tze204_ids = $tze204List.Count
            total_tze284_ids = $tze284Existing.Count
            coverage_percentage = [math]::Round(($tze284Existing.Count / $tze204List.Count) * 100, 1)
        }
        summary = @{
            total_categories = $categoryMap.Count
            priority_categories = $priorityCategories.Count
            potential_missing = $mappingSuggestions.potential_missing.Count
        }
        existing_tze204 = $mappingSuggestions.existing_tze204
        existing_tze284 = $mappingSuggestions.existing_tze284
        potential_missing_tze284 = $mappingSuggestions.potential_missing
        driver_categories = $mappingSuggestions.driver_categories
    }
    
    $report | ConvertTo-Json -Depth 10 | Out-File $reportPath -Encoding UTF8
    Write-Host "✅ Rapport exporté: $reportPath`n" -ForegroundColor Green
}

# Display summary
Write-Host "`n╔════════════════════════════════════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "║                         RÉSUMÉ FINAL                                ║" -ForegroundColor Cyan
Write-Host "╚════════════════════════════════════════════════════════════════════╝`n" -ForegroundColor Cyan

Write-Host "📊 Statistiques Globales:" -ForegroundColor Yellow
Write-Host "  • Total _TZE204_ IDs:         $($tze204List.Count)" -ForegroundColor White
Write-Host "  • Total _TZE284_ IDs:         $($tze284Existing.Count)" -ForegroundColor White
Write-Host "  • Coverage _TZE284_:          $([math]::Round(($tze284Existing.Count / $tze204List.Count) * 100, 1))%" -ForegroundColor $(
    $coverage = [math]::Round(($tze284Existing.Count / $tze204List.Count) * 100, 1)
    if ($coverage -ge 50) { "Green" } elseif ($coverage -ge 25) { "Yellow" } else { "Red" }
)
Write-Host "  • Catégories analysées:       $($categoryMap.Count)" -ForegroundColor White
Write-Host "  • Variants potentiels:        $($mappingSuggestions.potential_missing.Count)" -ForegroundColor Yellow

Write-Host "`n🎯 Prochaines Actions:" -ForegroundColor Yellow
Write-Host "  1. Rechercher les $($mappingSuggestions.potential_missing.Count) variants _TZE284_ prioritaires" -ForegroundColor White
Write-Host "  2. Consulter Zigbee2MQTT et GitHub pour validation" -ForegroundColor White
Write-Host "  3. Ajouter les IDs trouvés aux drivers appropriés" -ForegroundColor White
Write-Host "  4. Enrichir MANUFACTURER_DATABASE.json" -ForegroundColor White

Write-Host "`n✅ Mapping terminé!`n" -ForegroundColor Green
