Write-Host "🚀 MEGA RESTORE - Récupération de tous les drivers..." -ForegroundColor Green

# Configuration des familles de drivers
$DRIVER_FAMILIES = @{
    "light" = @{ class = "light"; caps = @("onoff", "dim") }
    "switch" = @{ class = "light"; caps = @("onoff") }
    "sensor-contact" = @{ class = "sensor"; caps = @("alarm_contact", "alarm_battery") }
    "sensor-motion" = @{ class = "sensor"; caps = @("alarm_motion", "alarm_battery") }
    "sensor-temp" = @{ class = "sensor"; caps = @("measure_temperature", "alarm_battery") }
    "sensor-humidity" = @{ class = "sensor"; caps = @("measure_humidity", "alarm_battery") }
    "sensor-gas" = @{ class = "sensor"; caps = @("alarm_gas", "alarm_battery") }
    "sensor-smoke" = @{ class = "sensor"; caps = @("alarm_smoke", "alarm_battery") }
    "sensor-vibration" = @{ class = "sensor"; caps = @("alarm_vibration", "alarm_battery") }
    "sensor-water" = @{ class = "sensor"; caps = @("alarm_water", "alarm_battery") }
    "cover" = @{ class = "windowcoverings"; caps = @("windowcoverings_set", "windowcoverings_state") }
    "fan" = @{ class = "fan"; caps = @("onoff", "dim") }
    "heater" = @{ class = "thermostat"; caps = @("target_temperature", "measure_temperature") }
    "lock" = @{ class = "lock"; caps = @("locked") }
    "ac" = @{ class = "thermostat"; caps = @("target_temperature", "thermostat_mode") }
    "other" = @{ class = "sensor"; caps = @("alarm_battery") }
}

$totalRestored = 0
$totalSkipped = 0

# Parcourir toutes les catégories
foreach ($category in $DRIVER_FAMILIES.Keys) {
    $categoryPath = "catalog\$category"
    if (Test-Path $categoryPath) {
        $tuyaPath = "$categoryPath\tuya"
        if (Test-Path $tuyaPath) {
            $drivers = Get-ChildItem $tuyaPath -Directory
            Write-Host "📁 Traitement de la catégorie: $category" -ForegroundColor Yellow
            Write-Host "  Trouvé $($drivers.Count) drivers" -ForegroundColor Cyan
            
            foreach ($driver in $drivers) {
                $driverId = "$($driver.Name)-tuya"
                $driverDir = "drivers\$driverId"
                
                # Vérifier si le driver existe déjà
                if (Test-Path $driverDir) {
                    Write-Host "  ⏭️ $driverId existe déjà" -ForegroundColor Gray
                    $totalSkipped++
                    continue
                }
                
                # Créer le driver
                New-Item -ItemType Directory -Path $driverDir -Force | Out-Null
                New-Item -ItemType Directory -Path "$driverDir\assets" -Force | Out-Null
                
                # Créer driver.compose.json
                $compose = @{
                    id = $driverId
                    name = @{ en = "$($driver.Name) (Tuya)" }
                    class = $DRIVER_FAMILIES[$category].class
                    capabilities = $DRIVER_FAMILIES[$category].caps
                    images = @{
                        small = "assets/small.png"
                        large = "assets/large.png"
                        xlarge = "assets/xlarge.png"
                    }
                    zigbee = @{
                        manufacturerName = @("_TZ3000_*", "_TZE200_*")
                        productId = @("TS011F", "TS0601", "TS0041", "TS0042", "TS0043", "TS0044")
                    }
                }
                
                $compose | ConvertTo-Json -Depth 10 | Set-Content "$driverDir\driver.compose.json"
                
                # Créer device.js
                $deviceJs = @"
'use strict';

const { ZigBeeDevice } = require('homey-zigbeedriver');

module.exports = class $($driverId -replace '-', '')Device extends ZigBeeDevice {
    async onNodeInit({ zclNode }) {
        this.log('🔌 $driverId initialisé');
        
        // Enregistrer les capacités de base
        this.registerCapability('alarm_battery', 'genPowerCfg', {
            endpoint: 1,
            cluster: 'genPowerCfg',
            attribute: 'batteryPercentageRemaining',
            reportParser: (value) => this.parseBattery(value)
        });
        
        await this.setupReporting();
    }
    
    async setupReporting() {
        try {
            await this.configureAttributeReporting([
                {
                    endpointId: 1,
                    clusterId: 'genPowerCfg',
                    attributeId: 'batteryPercentageRemaining',
                    minInterval: 0,
                    maxInterval: 300,
                    reportableChange: 1
                }
            ]);
        } catch (error) {
            this.log('Erreur lors de la configuration des rapports:', error);
        }
    }
    
    parseBattery(value) {
        return Math.round(value / 2); // 0-100%
    }
};
"@
                
                $deviceJs | Set-Content "$driverDir\device.js"
                
                # Créer assets placeholder
                @("small.png", "large.png", "xlarge.png") | ForEach-Object {
                    New-Item -ItemType File -Path "$driverDir\assets\$_" -Force | Out-Null
                }
                
                Write-Host "  ✅ $driverId restauré" -ForegroundColor Green
                $totalRestored++
            }
        }
    }
}

Write-Host "`n🎉 RESTAURATION TERMINÉE !" -ForegroundColor Green
Write-Host "✅ Drivers restaurés: $totalRestored" -ForegroundColor Green
Write-Host "⏭️ Drivers ignorés: $totalSkipped" -ForegroundColor Yellow
Write-Host "📊 Total traité: $($totalRestored + $totalSkipped)" -ForegroundColor Cyan

Write-Host "::END::MEGA_RESTORE::OK" -ForegroundColor Green
