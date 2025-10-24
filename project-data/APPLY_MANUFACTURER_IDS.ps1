# Script d'application automatique des manufacturer IDs aux drivers
# Ajoute les IDs manquants aux fichiers driver.compose.json appropriés

param(
    [switch]$DryRun = $false,  # Mode simulation sans modifications
    [switch]$Backup = $true     # Créer backups avant modification
)

$driversPath = "c:\Users\HP\Desktop\homey app\tuya_repair\drivers"
$backupPath = "c:\Users\HP\Desktop\homey app\tuya_repair\project-data\backups\drivers_$(Get-Date -Format 'yyyyMMdd_HHmmss')"

# Mappings manufacturer ID → driver
$additions = @{
    "dimmer_switch_1gang_ac" = @{
        manufacturerNames = @("_TYZB01_qezuin6k", "_TZ3000_92chsky7", "_TZ3000_ktuoyvt5", "_TZ3000_mgusv51k",
                              "_TZ3210_k1msuvg6", "_TZ3210_ngqk6jia", "_TZ3210_weaqkhab", "_TZ3210_zxbtub8r",
                              "_TZE200_1agwnems", "_TZE200_4mh6tyyo", "_TZE200_579lguh2", "_TZE200_ip2akl4w",
                              "_TZE200_la2c2uo9", "_TZE200_vucankjx", "_TZE204_9qhuzgo0", "_TZE204_hlx9tnzb", "_TZE204_n9ctkb6j")
        productIds = @("TS110F", "TS0052", "TS110E", "TS0601")
    }
    "dimmer_switch_3gang_ac" = @{
        manufacturerNames = @("_TYZB01_v8gtiaed", "_TZ3210_3mpwqzuu", "_TZ3210_4ubylghk", "_TZ3210_pagajpog",
                              "_TZ3210_wdexaypg", "_TZE200_e3oitdyu", "_TZE200_fjjbhx9d", "_TZE200_gwkapsoq",
                              "_TZE204_bxoo2swd", "_TZE204_zenj4lxv")
        productIds = @("TS110F", "TS110E", "TS0601")
    }
    "dimmer_ac" = @{
        manufacturerNames = @("_TZE200_3p5ydos3")
        productIds = @("TS0601")
    }
    "bulb_color_rgbcct_ac" = @{
        manufacturerNames = @("_TZ3000_12sxjap4", "_TZ3000_5bsf8vaj", "_TZ3000_9cpuaca6", "_TZ3000_h1jnz6l8",
                              "_TZ3000_hlijwsai", "_TZ3000_kdpxju99", "_TZ3000_keabpigv", "_TZ3000_q50zhdsc",
                              "_TZ3000_qd7hej8u", "_TZ3000_utagpnzs", "_TZ3210_iystcadi", "_TZ3210_mja6r5ix", "_TZ3210_r0xgkft5")
        productIds = @("TS0505A", "TS0505B")
    }
    "bulb_white_ambiance_ac" = @{
        manufacturerNames = @("_TZ3000_49qchf10", "_TZ3000_8uaoilu9", "_TZ3000_el5kt5im", "_TZ3000_oborybow")
        productIds = @("TS0502A")
    }
    "bulb_white_ac" = @{
        manufacturerNames = @("_TZ3210_zdrhqmo0")
        productIds = @("TS0502B")
    }
    "led_strip_controller_ac" = @{
        manufacturerNames = @("_TZ3000_dl4pxp1r", "_TZ3000_gek6snaj", "_TZ3000_i8l0nqdu", "_TZ3000_obacbukl",
                              "_TZ3000_qqjaziws", "_TZ3000_ukuvyhaa", "_TZ3210_invesber", "_TZ3210_k1pe6ibm")
        productIds = @("TS0503A", "TS0503B", "TS0504B", "TS0505A", "TS0505B", "TS0502B")
    }
    "ceiling_light_rgb_ac" = @{
        manufacturerNames = @("_TZ3210_x13bu7za")
        productIds = @("TS0505B")
    }
    "led_strip_outdoor_color_ac" = @{
        manufacturerNames = @("_TZE200_s8gkrkxk")
        productIds = @("TS0601")
    }
    "switch_1gang_battery" = @{
        manufacturerNames = @("_TYZB01_xfpdrwvc", "_TYZB02_keyjqthh")
        productIds = @("TS0011", "TS0041")
    }
    "switch_2gang_battery" = @{
        manufacturerNames = @("_TYZB01_mtlhqn48", "_TYZB02_keyjhapk", "_TZ3400_keyjhapk")
        productIds = @("TS0012", "TS0042")
    }
    "switch_3gang_battery" = @{
        manufacturerNames = @("_TYZB01_xiuox57i")
        productIds = @("TS0013")
    }
    "switch_module_1gang_ac" = @{
        manufacturerNames = @("_TYZB01_ncutbjdi")
        productIds = @("TS0003")
    }
    "switch_module_2gang_ac" = @{
        manufacturerNames = @("_TYZB01_digziiav", "_TYZB01_zsl6z0pw", "_TZ3000_18ejxno0", "_TZ3000_4js9lo5d",
                              "_TZ3000_7ed9cqgi", "_TZ3000_bvrlqyj7", "_TZ3000_fisb3ajo", "_TZ3000_jl7qyupf",
                              "_TZ3000_llfaquvp", "_TZ3000_lmlsduws", "_TZ3000_qaa59zqd")
        productIds = @("TS0002", "TS0003", "TS0012", "TS0013")
    }
    "switch_module_2gang_metering_ac" = @{
        manufacturerNames = @("_TZ3000_pmz6mjyu", "_TZ3000_zmy4lslw")
        productIds = @("TS0002", "TS011F")
    }
    "switch_module_3gang_ac" = @{
        manufacturerNames = @("_TZ3000_lvhy15ix", "_TZ3000_odzoiovu")
        productIds = @("TS0003")
    }
    "extension_plug_ac" = @{
        manufacturerNames = @("_TZ3000_1obwwnmq", "_TZ3000_4uf3d0ax", "_TZ3000_vmpbygs5", "_TZ3000_vzopcetz", "_TZ3000_wzauvbcs")
        productIds = @("TS011F")
    }
    "smart_plug_energy_ac" = @{
        manufacturerNames = @("_TZ3210_7jnk7l3k")
        productIds = @("TS011F")
    }
    "temperature_humidity_sensor_battery" = @{
        manufacturerNames = @("_TYZB01_a476raq2", "_TYZB01_hjsgdkfl", "_TZ2000_xogb73am", "_TZ3210_ncw88jfq")
        productIds = @("TS0201", "TY0201")
    }
    "motion_sensor_battery" = @{
        manufacturerNames = @("_TYZB01_dl7cejts", "_TYZB01_jytabjkb")
        productIds = @("TS0202")
    }
    "motion_sensor_mmwave_battery" = @{
        manufacturerNames = @("_TZE200_holel4dk", "_TZE200_ikvncluo", "_TZE200_jva8ink8", "_TZE200_lyetpprm",
                              "_TZE200_sgpeacqp", "_TZE200_wukb7rhc", "_TZE200_xpq2rzhq", "_TZE204_ijxvkhd0",
                              "_TZE204_qasjif9e", "_TZE204_sxm7l9xa", "_TZE204_xsm7l9xa")
        productIds = @("TS0601")
    }
    "door_window_sensor_battery" = @{
        manufacturerNames = @("_TYZB01_xph99wvr")
        productIds = @("RH3001")
    }
    "water_sensor_battery" = @{
        manufacturerNames = @("_TYZB01_sqmd19i1")
        productIds = @("TS0207")
    }
    "smoke_detector_battery" = @{
        manufacturerNames = @("_TYZB01_dsjszp0x", "_TYZB01_wqcac7lo")
        productIds = @("TS0205")
    }
    "valve_controller_battery" = @{
        manufacturerNames = @("_TYZB01_4tlksk8a", "_TYZB01_ymcdbl3u")
        productIds = @("TS0001", "TS0111")
    }
    "curtain_motor_ac" = @{
        manufacturerNames = @("_TZ3210_dwytrmda", "_TZ3210_ol1uhvza", "_TZE204_1fuxihti")
        productIds = @("TS130F", "TS0601")
    }
    "garage_door_controller_ac" = @{
        manufacturerNames = @("_TZ3210_eymunffl")
        productIds = @("TS0101")
    }
    "air_quality_monitor_ac" = @{
        manufacturerNames = @("_TZE200_c2fmom5z", "_TZE200_mja3fuja", "_TZE200_yvx5lh6k")
        productIds = @("TS0601")
    }
    "soil_humidity_sensor_battery" = @{
        manufacturerNames = @("_TZE204_myd45weu")
        productIds = @("TS0601")
    }
    "thermostat_ac" = @{
        manufacturerNames = @("_TZE204_aoclfnxz")
        productIds = @("TS0601")
    }
}

function Add-ManufacturerIds {
    param(
        [string]$DriverPath,
        [array]$NewManufacturerNames,
        [array]$NewProductIds
    )
    
    $composeFile = Join-Path $DriverPath "driver.compose.json"
    
    if (-not (Test-Path $composeFile)) {
        Write-Host "  ⚠️ Fichier non trouvé: $composeFile" -ForegroundColor Yellow
        return $false
    }
    
    try {
        $json = Get-Content $composeFile -Raw | ConvertFrom-Json
        
        if (-not $json.zigbee) {
            Write-Host "  ⚠️ Pas de section zigbee dans: $composeFile" -ForegroundColor Yellow
            return $false
        }
        
        # Récupérer les IDs existants
        $existingMfr = @()
        if ($json.zigbee.manufacturerName) {
            if ($json.zigbee.manufacturerName -is [System.Array]) {
                $existingMfr = $json.zigbee.manufacturerName
            } else {
                $existingMfr = @($json.zigbee.manufacturerName)
            }
        }
        
        $existingProd = @()
        if ($json.zigbee.productId) {
            if ($json.zigbee.productId -is [System.Array]) {
                $existingProd = $json.zigbee.productId
            } else {
                $existingProd = @($json.zigbee.productId)
            }
        }
        
        # Identifier les nouveaux IDs à ajouter
        $toAddMfr = @()
        foreach ($id in $NewManufacturerNames) {
            if ($existingMfr -notcontains $id) {
                $toAddMfr += $id
            }
        }
        
        $toAddProd = @()
        foreach ($id in $NewProductIds) {
            if ($existingProd -notcontains $id) {
                $toAddProd += $id
            }
        }
        
        if ($toAddMfr.Count -eq 0 -and $toAddProd.Count -eq 0) {
            Write-Host "  ℹ️ Aucun nouvel ID à ajouter" -ForegroundColor Gray
            return $false
        }
        
        Write-Host "  ➕ Ajout de $($toAddMfr.Count) manufacturer IDs et $($toAddProd.Count) product IDs" -ForegroundColor Green
        
        if ($DryRun) {
            Write-Host "    [DRY RUN] Les IDs suivants seraient ajoutés:" -ForegroundColor Cyan
            $toAddMfr | ForEach-Object { Write-Host "      - $_" -ForegroundColor Gray }
            return $true
        }
        
        # Créer backup si demandé
        if ($Backup) {
            $backupDir = Join-Path $backupPath (Split-Path $DriverPath -Leaf)
            if (-not (Test-Path $backupDir)) {
                New-Item -ItemType Directory -Path $backupDir -Force | Out-Null
            }
            Copy-Item $composeFile (Join-Path $backupDir "driver.compose.json.bak") -Force
        }
        
        # Lire le contenu brut pour préserver la mise en forme
        $content = Get-Content $composeFile -Raw
        
        # Ajouter les manufacturer IDs
        if ($toAddMfr.Count -gt 0) {
            # Trouver la section manufacturerName
            $pattern = '("manufacturerName":\s*\[)(.*?)(\])'
            if ($content -match $pattern) {
                $existingIds = $matches[2].Trim().TrimEnd(',')
                $newIds = ($toAddMfr | ForEach-Object { "`"$_`"" }) -join ",`n      "
                
                if ($existingIds) {
                    $replacement = "`$1`n      $existingIds,`n      $newIds`n    `$3"
                } else {
                    $replacement = "`$1`n      $newIds`n    `$3"
                }
                
                $content = $content -replace $pattern, $replacement
            }
        }
        
        # Ajouter les product IDs
        if ($toAddProd.Count -gt 0) {
            $pattern = '("productId":\s*\[)(.*?)(\])'
            if ($content -match $pattern) {
                $existingIds = $matches[2].Trim().TrimEnd(',')
                $newIds = ($toAddProd | ForEach-Object { "`"$_`"" }) -join ",`n      "
                
                if ($existingIds) {
                    $replacement = "`$1`n      $existingIds,`n      $newIds`n    `$3"
                } else {
                    $replacement = "`$1`n      $newIds`n    `$3"
                }
                
                $content = $content -replace $pattern, $replacement
            }
        }
        
        # Sauvegarder
        $content | Set-Content $composeFile -NoNewline
        
        Write-Host "    ✅ Fichier mis à jour avec succès" -ForegroundColor Green
        return $true
        
    } catch {
        Write-Host "  ❌ Erreur: $_" -ForegroundColor Red
        return $false
    }
}

# Main execution
Write-Host "🚀 APPLICATION DES MANUFACTURER IDs" -ForegroundColor Cyan
Write-Host "=" * 80

if ($DryRun) {
    Write-Host "⚠️ MODE DRY RUN - Aucune modification ne sera appliquée`n" -ForegroundColor Yellow
}

if ($Backup -and -not $DryRun) {
    Write-Host "📁 Création des backups dans: $backupPath`n" -ForegroundColor Cyan
    New-Item -ItemType Directory -Path $backupPath -Force | Out-Null
}

$totalDrivers = 0
$updatedDrivers = 0
$totalNewIds = 0

foreach ($driverName in $additions.Keys | Sort-Object) {
    $driverPath = Join-Path $driversPath $driverName
    
    if (-not (Test-Path $driverPath)) {
        Write-Host "⚠️ Driver non trouvé: $driverName" -ForegroundColor Yellow
        continue
    }
    
    $totalDrivers++
    Write-Host "`n📦 $driverName" -ForegroundColor Yellow
    
    $mfrIds = $additions[$driverName].manufacturerNames
    $prodIds = $additions[$driverName].productIds
    
    $totalNewIds += $mfrIds.Count
    
    if (Add-ManufacturerIds -DriverPath $driverPath -NewManufacturerNames $mfrIds -NewProductIds $prodIds) {
        $updatedDrivers++
    }
}

Write-Host "`n" + ("=" * 80)
Write-Host "✅ OPÉRATION TERMINÉE" -ForegroundColor Green
Write-Host "=" * 80
Write-Host "Drivers traités: $totalDrivers"
Write-Host "Drivers mis à jour: $updatedDrivers"
Write-Host "Manufacturer IDs potentiellement ajoutés: $totalNewIds"

if ($DryRun) {
    Write-Host "`n💡 Exécutez sans -DryRun pour appliquer les modifications" -ForegroundColor Cyan
} elseif ($Backup) {
    Write-Host "`n📁 Backups sauvegardés dans: $backupPath" -ForegroundColor Cyan
}

Write-Host "`n🔍 Prochaine étape: Validation Homey SDK3" -ForegroundColor Magenta
Write-Host "   Commande: homey app validate" -ForegroundColor Gray
