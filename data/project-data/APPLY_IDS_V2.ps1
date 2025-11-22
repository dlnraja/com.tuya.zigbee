# Version améliorée - Manipulation JSON correcte

$driversPath = "c:\Users\HP\Desktop\homey app\tuya_repair\drivers"

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
    "switch_3gang_battery" = @{
        manufacturerNames = @("_TYZB01_xiuox57i")
        productIds = @("TS0013")
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
    "smoke_detector_battery" = @{
        manufacturerNames = @("_TYZB01_dsjszp0x", "_TYZB01_wqcac7lo")
        productIds = @("TS0205")
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
}

$totalAdded = 0
$driversUpdated = 0

foreach ($driverName in $additions.Keys | Sort-Object) {
    $driverPath = Join-Path $driversPath $driverName
    $composeFile = Join-Path $driverPath "driver.compose.json"
    
    if (-not (Test-Path $composeFile)) {
        continue
    }
    
    Write-Host "`n📦 $driverName" -ForegroundColor Yellow
    
    try {
        # Lire et parser le JSON
        $json = Get-Content $composeFile -Raw | ConvertFrom-Json
        
        # Convertir les IDs existants en liste mutable
        $existingMfr = [System.Collections.ArrayList]@()
        if ($json.zigbee.manufacturerName) {
            foreach ($id in $json.zigbee.manufacturerName) {
                [void]$existingMfr.Add($id)
            }
        }
        
        $existingProd = [System.Collections.ArrayList]@()
        if ($json.zigbee.productId) {
            foreach ($id in $json.zigbee.productId) {
                [void]$existingProd.Add($id)
            }
        }
        
        # Ajouter les nouveaux IDs
        $addedMfr = 0
        foreach ($id in $additions[$driverName].manufacturerNames) {
            if ($id -notin $existingMfr) {
                [void]$existingMfr.Add($id)
                $addedMfr++
            }
        }
        
        $addedProd = 0
        foreach ($id in $additions[$driverName].productIds) {
            if ($id -notin $existingProd) {
                [void]$existingProd.Add($id)
                $addedProd++
            }
        }
        
        if ($addedMfr -eq 0 -and $addedProd -eq 0) {
            Write-Host "  ℹ️ Aucun nouvel ID à ajouter" -ForegroundColor Gray
            continue
        }
        
        Write-Host "  ➕ Ajout de $addedMfr manufacturer IDs et $addedProd product IDs" -ForegroundColor Green
        
        # Mettre à jour l'objet JSON
        $json.zigbee.manufacturerName = $existingMfr.ToArray()
        $json.zigbee.productId = $existingProd.ToArray()
        
        # Écrire le JSON avec indentation
        $json | ConvertTo-Json -Depth 100 | Set-Content $composeFile -Encoding UTF8
        
        $totalAdded += $addedMfr
        $driversUpdated++
        Write-Host "    ✅ Fichier mis à jour" -ForegroundColor Green
        
    } catch {
        Write-Host "  ❌ Erreur: $_" -ForegroundColor Red
    }
}

Write-Host "`n" + ("=" * 80)
Write-Host "✅ TERMINÉ" -ForegroundColor Green
Write-Host "Drivers mis à jour: $driversUpdated"
Write-Host "Manufacturer IDs ajoutés: $totalAdded"
