Write-Host "🚀 RESTAURATION MASSIVE DES DRIVERS..." -ForegroundColor Green

$categories = @("light", "switch", "sensor-contact", "sensor-motion", "sensor-temp", "sensor-humidity", "sensor-gas", "sensor-smoke", "sensor-vibration", "sensor-water", "cover", "fan", "heater", "lock", "ac", "other")

$totalRestored = 0
$totalSkipped = 0

foreach ($category in $categories) {
    $categoryPath = "catalog\$category"
    if (Test-Path $categoryPath) {
        $tuyaPath = "$categoryPath\tuya"
        if (Test-Path $tuyaPath) {
            $drivers = Get-ChildItem $tuyaPath -Directory
            Write-Host "📁 $category`: $($drivers.Count) drivers" -ForegroundColor Yellow
            
            foreach ($driver in $drivers) {
                $driverId = "$($driver.Name)-tuya"
                $driverDir = "drivers\$driverId"
                
                if (Test-Path $driverDir) {
                    Write-Host "  ⏭️ $driverId existe déjà" -ForegroundColor Gray
                    $totalSkipped++
                } else {
                    New-Item -ItemType Directory -Path $driverDir -Force | Out-Null
                    New-Item -ItemType Directory -Path "$driverDir\assets" -Force | Out-Null
                    
                    # Créer driver.compose.json
                    $compose = @{
                        id = $driverId
                        name = @{ en = "$($driver.Name) (Tuya)" }
                        class = "sensor"
                        capabilities = @("alarm_battery")
                        images = @{
                            small = "assets/small.png"
                            large = "assets/large.png"
                            xlarge = "assets/xlarge.png"
                        }
                        zigbee = @{
                            manufacturerName = @("_TZ3000_*", "_TZE200_*")
                            productId = @("TS011F", "TS0601")
                        }
                    }
                    
                    $compose | ConvertTo-Json -Depth 10 | Set-Content "$driverDir\driver.compose.json"
                    
                    # Créer device.js
                    $deviceJs = @"
'use strict';
const { ZigBeeDevice } = require('homey-zigbeedriver');
module.exports = class $($driverId -replace '-', '')Device extends ZigBeeDevice {
    async onNodeInit() {
        this.log('$driverId: initialisé');
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
}

Write-Host "`n🎉 RESTAURATION TERMINÉE !" -ForegroundColor Green
Write-Host "✅ Drivers restaurés: $totalRestored" -ForegroundColor Green
Write-Host "⏭️ Drivers ignorés: $totalSkipped" -ForegroundColor Yellow
Write-Host "📊 Total traité: $($totalRestored + $totalSkipped)" -ForegroundColor Cyan

Write-Host "::END::MASSIVE_RESTORE::OK" -ForegroundColor Green
