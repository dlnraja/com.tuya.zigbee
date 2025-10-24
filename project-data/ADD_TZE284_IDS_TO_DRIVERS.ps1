# ============================================================================
# ADD_TZE284_IDS_TO_DRIVERS.ps1
# ============================================================================
# Description: Add new _TZE284_ manufacturer IDs to appropriate drivers
# Author: Universal Tuya Zigbee Project
# Version: 1.0.0
# Date: 2025-01-15
# ============================================================================

$projectRoot = Split-Path -Parent $PSScriptRoot
$driversPath = Join-Path $projectRoot "drivers"

Write-Host "`n🚀 Adding _TZE284_ IDs to drivers...`n" -ForegroundColor Cyan

# Define mapping of IDs to drivers
$mappings = @{
    "_TZE284_mrf6vtua" = @(
        "motion_sensor_battery",
        "motion_sensor_illuminance_battery",
        "motion_sensor_pir_ac_battery",
        "motion_sensor_pir_battery",
        "motion_sensor_zigbee_204z_battery",
        "radar_motion_sensor_advanced_battery",
        "radar_motion_sensor_mmwave_battery",
        "radar_motion_sensor_tank_level_battery"
    )
    "_TZE284_5cuocqty" = @("smart_plug_energy_ac")
    "_TZE284_bjzrowv2" = @("smart_plug_energy_ac")
    "_TZE284_ahwvlkpy" = @("smart_plug_energy_ac")
    "_TZE284_dapwryy7" = @("smart_plug_energy_ac")
    "_TZE284_dcnsggvz" = @("smart_plug_energy_ac")
    "_TZE284_9qhuzgo0" = @("dimmer_switch_1gang_ac")
    "_TZE284_hlx9tnzb" = @("dimmer_switch_1gang_ac")
    "_TZE284_n9ctkb6j" = @("dimmer_switch_1gang_ac")
    "_TZE284_1fuxihti" = @("curtain_motor_ac")
    "_TZE284_ezqy5pvh" = @("gas_sensor_ts0601_ac")
    "_TZE284_ggev5fsl" = @("gas_sensor_ts0601_battery")
}

$totalAdded = 0
$errors = 0

foreach ($id in $mappings.Keys) {
    foreach ($driverName in $mappings[$id]) {
        $driverPath = Join-Path $driversPath $driverName
        $composeFile = Join-Path $driverPath "driver.compose.json"
        
        if (-not (Test-Path $composeFile)) {
            Write-Host "❌ Driver not found: $driverName" -ForegroundColor Red
            $errors++
            continue
        }
        
        try {
            $content = Get-Content $composeFile -Raw | ConvertFrom-Json
            
            # Check if ID already exists
            if ($content.zigbee.manufacturerName -contains $id) {
                Write-Host "  ℹ️  $id already in $driverName" -ForegroundColor Gray
                continue
            }
            
            # Add the new ID
            $content.zigbee.manufacturerName += $id
            
            # Save back to file
            $content | ConvertTo-Json -Depth 20 | Set-Content $composeFile -Encoding UTF8
            
            Write-Host "  ✅ Added $id to $driverName" -ForegroundColor Green
            $totalAdded++
        }
        catch {
            Write-Host "  ❌ Error adding $id to $driverName : $_" -ForegroundColor Red
            $errors++
        }
    }
}

Write-Host "`n╔════════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "║           RÉSUMÉ FINAL                 ║" -ForegroundColor Cyan
Write-Host "╚════════════════════════════════════════╝`n" -ForegroundColor Cyan

Write-Host "✅ IDs ajoutés: $totalAdded" -ForegroundColor Green
if ($errors -gt 0) {
    Write-Host "❌ Erreurs: $errors" -ForegroundColor Red
}

Write-Host "`n✅ Opération terminée!`n" -ForegroundColor Green
