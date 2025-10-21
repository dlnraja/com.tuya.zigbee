# Add Driver Metadata (Category, Power Source, etc.)
# Safe approach: Add metadata without moving files

param(
    [switch]$DryRun = $false
)

$ErrorActionPreference = "Stop"
$projectRoot = "c:\Users\HP\Desktop\homey app\tuya_repair"
Set-Location $projectRoot

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  ADD DRIVER METADATA" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Category mapping
$categoryMapping = @{
    # Lighting
    "bulb_" = "lighting"
    "led_strip" = "lighting"
    "ceiling_light" = "lighting"
    "milight" = "lighting"
    
    # Switches
    "switch_" = "switches"
    "dimmer" = "switches"
    "mini_switch" = "switches"
    "remote_switch" = "switches"
    
    # Plugs
    "_plug" = "plugs"
    "mini_ac" = "plugs"
    "extension_plug" = "plugs"
    
    # Sensors
    "motion_sensor" = "sensors/motion"
    "door_window" = "sensors/contact"
    "contact_sensor" = "sensors/contact"
    "vibration" = "sensors/contact"
    "temperature" = "sensors/climate"
    "humidity" = "sensors/climate"
    "climate_monitor" = "sensors/climate"
    "co2_" = "sensors/climate"
    "air_quality" = "sensors/air_quality"
    "formaldehyde" = "sensors/air_quality"
    "smoke_detector" = "sensors/safety"
    "gas_" = "sensors/safety"
    "co_detector" = "sensors/safety"
    "water_leak" = "sensors/safety"
    "lux_sensor" = "sensors/other"
    "soil_moisture" = "sensors/other"
    
    # Security
    "alarm_" = "security"
    "siren_" = "security"
    "sos_button" = "security"
    "_lock" = "security"
    "doorbell" = "security"
    
    # Climate
    "thermostat" = "climate"
    "hvac_" = "climate"
    "trv_" = "climate"
    "fan_controller" = "climate"
    
    # Motors
    "curtain" = "motors"
    "blind" = "motors"
    "valve_controller" = "motors"
    "garage_door" = "motors"
    "door_controller" = "motors"
    
    # Buttons
    "button_" = "buttons"
    "scene_switch" = "buttons"
    "rotary_dimmer" = "buttons"
    "wireless_switch" = "buttons"
    
    # Specialized
    "ceiling_fan" = "specialized"
    "pet_feeder" = "specialized"
    "irrigation" = "specialized"
    "presence_detector" = "specialized"
    "occupancy" = "specialized"
}

# Power source detection
function Get-PowerSource {
    param($driverName)
    
    if ($driverName -match "_ac$|_ac_") { return "ac" }
    if ($driverName -match "cr2032") { return "battery", "CR2032" }
    if ($driverName -match "cr2450") { return "battery", "CR2450" }
    if ($driverName -match "_battery") { return "battery", "replaceable" }
    if ($driverName -match "gas_sensor_ts0601") { return "hybrid", "ac+battery" }
    
    return "unknown", "unknown"
}

# Detect category
function Get-Category {
    param($driverName)
    
    foreach ($pattern in $categoryMapping.Keys) {
        if ($driverName -match $pattern) {
            return $categoryMapping[$pattern]
        }
    }
    
    return "uncategorized"
}

Write-Host "1. Analyse drivers..." -ForegroundColor Yellow
$driversPath = Join-Path $projectRoot "drivers"
$drivers = Get-ChildItem -Path $driversPath -Directory

$categorized = @{}
$powerSources = @{}

foreach ($driver in $drivers) {
    $category = Get-Category $driver.Name
    $powerSource, $powerType = Get-PowerSource $driver.Name
    
    if (-not $categorized.ContainsKey($category)) {
        $categorized[$category] = @()
    }
    $categorized[$category] += $driver.Name
    
    if (-not $powerSources.ContainsKey($powerSource)) {
        $powerSources[$powerSource] = 0
    }
    $powerSources[$powerSource]++
}

Write-Host ""
Write-Host "2. Statistiques..." -ForegroundColor Yellow
Write-Host "   Total drivers: $($drivers.Count)" -ForegroundColor White

Write-Host ""
Write-Host "   Categories:" -ForegroundColor Cyan
foreach ($cat in $categorized.Keys | Sort-Object) {
    Write-Host "     $cat : $($categorized[$cat].Count)" -ForegroundColor White
}

Write-Host ""
Write-Host "   Power Sources:" -ForegroundColor Cyan
foreach ($ps in $powerSources.Keys | Sort-Object) {
    Write-Host "     $ps : $($powerSources[$ps])" -ForegroundColor White
}

Write-Host ""
Write-Host "3. Creation DRIVER_CATEGORIES.json..." -ForegroundColor Yellow

$metadataJson = @{
    version = "1.0"
    generated = (Get-Date).ToString("yyyy-MM-dd HH:mm:ss")
    total_drivers = $drivers.Count
    categories = @{}
}

foreach ($driver in $drivers) {
    $category = Get-Category $driver.Name
    $powerSource, $powerType = Get-PowerSource $driver.Name
    
    $metadataJson.categories[$driver.Name] = @{
        category = $category
        power_source = $powerSource
        power_type = $powerType
        original_name = $driver.Name
    }
}

$jsonPath = Join-Path $projectRoot "DRIVER_CATEGORIES.json"

if (-not $DryRun) {
    $metadataJson | ConvertTo-Json -Depth 10 | Set-Content -Path $jsonPath -Encoding UTF8
    Write-Host "   Cree: DRIVER_CATEGORIES.json" -ForegroundColor Green
} else {
    Write-Host "   DRY RUN: Skip creation" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Green
Write-Host "  METADATA AJOUTEES" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
Write-Host ""
Write-Host "Fichier cree: DRIVER_CATEGORIES.json" -ForegroundColor Cyan
Write-Host "Contient:" -ForegroundColor White
Write-Host "  - Categories par driver" -ForegroundColor White
Write-Host "  - Power source detection" -ForegroundColor White
Write-Host "  - Mapping pour future migration" -ForegroundColor White
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Yellow
Write-Host "  1. Review DRIVER_CATEGORIES.json" -ForegroundColor White
Write-Host "  2. Adjust categories si necessaire" -ForegroundColor White
Write-Host "  3. Use pour documentation" -ForegroundColor White
Write-Host "  4. Plan v3.0.0 migration" -ForegroundColor White
