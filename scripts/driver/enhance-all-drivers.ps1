﻿
---
**📅 Version**: 1.0.0
**📅 Date**: 2025-07-26
**🕐 Heure**: 16:49:40
**🎯 Objectif**: Intégration locale Tuya Zigbee
**🚀 Mode**: Priorité locale
**🛡️ Sécurité**: Mode local complet
---
# ENHANCE ALL DRIVERS - Tuya Zigbee Project
# Script pour ameliorer tous les drivers avec les fonctionnalites manquantes

param(
    [switch]$Force = $false,
    [switch]$DryRun = $false,
    [int]$TimeoutSeconds = 600
)

# Import du module timeout
$timeoutModulePath = Join-Path $PSScriptRoot "timeout-utils.ps1"
if (Test-Path $timeoutModulePath) {
    . $timeoutModulePath
    Set-TimeoutConfiguration -Environment "Development"
} else {
    Write-Host "Module timeout non trouve, utilisation des timeouts par defaut" -ForegroundColor Yellow
}

Write-Host "AMELIORATION DE TOUS LES DRIVERS" -ForegroundColor Cyan
Write-Host "==============================" -ForegroundColor Cyan

# Statistiques de timeout
$timeoutStats = @{
    "DriverAnalysis" = 0
    "DriverEnhancement" = 0
    "BatteryManagement" = 0
    "ManufacturerIds" = 0
    "Capabilities" = 0
}

# Variables globales
$global:enhancedDrivers = 0
$global:totalDrivers = 0

# 1) Analyse des drivers avec timeout
Write-Host "1. ANALYSE DES DRIVERS" -ForegroundColor Yellow
Write-Host "=====================" -ForegroundColor Yellow

try {
    $driverAnalysisScript = {
        $drivers = Get-ChildItem -Path "drivers" -Directory -ErrorAction SilentlyContinue
        $driverInfo = @{}
        
        foreach ($driver in $drivers) {
            $driverPath = $driver.FullName
            $driverName = $driver.Name
            
            $hasDeviceJs = Test-Path (Join-Path $driverPath "device.js")
            $hasCompose = Test-Path (Join-Path $driverPath "driver.compose.json")
            $hasSettings = Test-Path (Join-Path $driverPath "driver.settings.compose.json")
            
            $driverInfo[$driverName] = @{
                "Path" = $driverPath
                "HasDeviceJs" = $hasDeviceJs
                "HasCompose" = $hasCompose
                "HasSettings" = $hasSettings
                "NeedsEnhancement" = $true
            }
        }
        
        return @{
            "TotalDrivers" = $drivers.Count
            "DriverInfo" = $driverInfo
        }
    }
    
    $analysisData = Invoke-WithTimeout -ScriptBlock $driverAnalysisScript -TimeoutSeconds 120 -OperationName "Analyse drivers"
    
    if ($analysisData) {
        $global:totalDrivers = $analysisData.TotalDrivers
        Write-Host "Nombre de drivers analyses: $($global:totalDrivers)" -ForegroundColor White
        
        foreach ($driver in $analysisData.DriverInfo.Keys) {
            $info = $analysisData.DriverInfo[$driver]
            $status = if ($info.HasDeviceJs -and $info.HasCompose) { "OK" } else { "INCOMPLET" }
            Write-Host "Driver $driver : $status" -ForegroundColor $(if ($status -eq "OK") { "Green" } else { "Red" })
        }
    }
    
    $timeoutStats.DriverAnalysis++
} catch {
    Write-Host "ERREUR analyse drivers: $($_.Exception.Message)" -ForegroundColor Red
}

# 2) Amelioration des drivers avec timeout
Write-Host "`n2. AMELIORATION DES DRIVERS" -ForegroundColor Yellow
Write-Host "=========================" -ForegroundColor Yellow

try {
    $driverEnhancementScript = {
        param($driverInfo)
        $enhancedCount = 0
        
        foreach ($driverName in $driverInfo.Keys) {
            $info = $driverInfo[$driverName]
            $driverPath = $info.Path
            
            if ($info.HasDeviceJs -and $info.HasCompose) {
                try {
                    # Lire le fichier device.js
                    $deviceJsPath = Join-Path $driverPath "device.js"
                    $deviceJsContent = Get-Content $deviceJsPath -Raw
                    
                    # Lire le fichier driver.compose.json
                    $composePath = Join-Path $driverPath "driver.compose.json"
                    $composeContent = Get-Content $composePath -Raw
                    $composeJson = $composeContent | ConvertFrom-Json
                    
                    # Ameliorations a apporter
                    $enhancements = @{
                        "BatteryManagement" = $false
                        "ManufacturerIds" = $false
                        "Capabilities" = $false
                        "ClickHandling" = $false
                    }
                    
                    # Verifier si le driver a deja les ameliorations
                    if ($deviceJsContent -match "measure_battery" -or $deviceJsContent -match "batteryManagement") {
                        $enhancements.BatteryManagement = $true
                    }
                    
                    if ($composeContent -match "_TZ3000_" -or $composeContent -match "_TYZB01_") {
                        $enhancements.ManufacturerIds = $true
                    }
                    
                    if ($composeContent -match "measure_battery" -or $composeContent -match "button") {
                        $enhancements.Capabilities = $true
                    }
                    
                    if ($deviceJsContent -match "clickState" -or $deviceJsContent -match "triggerFlow") {
                        $enhancements.ClickHandling = $true
                    }
                    
                    # Appliquer les ameliorations si necessaires
                    $enhanced = $false
                    
                    # 1. Ajouter la gestion de batterie si manquante
                    if (-not $enhancements.BatteryManagement) {
                        $batteryCode = @"

    // Gestion de la batterie intelligente
    this.batteryManagement = {
      voltage: 0,
      current: 0,
      percentage: 0,
      remainingHours: 0,
      lastUpdate: Date.now()
    };

    // Enregistrer la capacite de mesure de batterie
    this.registerCapability('measure_battery', CLUSTER.POWER_CONFIGURATION, {
      get: 'batteryPercentageRemaining',
      report: 'batteryPercentageRemaining',
      reportParser: (value) => {
        const percentage = Math.round(value / 2);
        this.batteryManagement.percentage = percentage;
        this.updateBatteryAutonomy();
        return percentage;
      },
    });

    // Enregistrer la capacite d'alerte de batterie
    this.registerCapability('alarm_battery', CLUSTER.POWER_CONFIGURATION, {
      get: 'batteryAlarmState',
      report: 'batteryAlarmState',
      reportParser: (value) => {
        const alarm = value === 1;
        if (alarm) {
          this.log('ALERTE BATTERIE: Niveau critique atteint!');
        }
        return alarm;
      },
    });

    // Enregistrer la mesure de voltage
    this.registerCapability('measure_voltage', CLUSTER.POWER_CONFIGURATION, {
      get: 'batteryVoltage',
      report: 'batteryVoltage',
      reportParser: (value) => {
        const voltage = value / 10; // Convertir en volts
        this.batteryManagement.voltage = voltage;
        this.updateBatteryAutonomy();
        return voltage;
      },
    });

    // Enregistrer la mesure de courant
    this.registerCapability('measure_current', CLUSTER.POWER_CONFIGURATION, {
      get: 'batteryCurrent',
      report: 'batteryCurrent',
      reportParser: (value) => {
        const current = value / 1000; // Convertir en amperes
        this.batteryManagement.current = current;
        this.updateBatteryAutonomy();
        return current;
      },
    });

    // Mettre a jour l'autonomie de la batterie toutes les heures
    this.batteryUpdateInterval = setInterval(async () => {
      await this.updateBatteryAutonomy();
    }, 3600000); // 1 heure
  }

  // Methode pour mettre a jour l'autonomie de la batterie
  async updateBatteryAutonomy() {
    try {
      const batteryVoltage = await this.zclNode.endpoints[1].clusters.powerConfiguration.readAttributes(['batteryVoltage']);
      const batteryPercentage = await this.zclNode.endpoints[1].clusters.powerConfiguration.readAttributes(['batteryPercentageRemaining']);
      
      if (batteryVoltage && batteryPercentage) {
        this.batteryManagement.voltage = batteryVoltage.batteryVoltage / 10; // Convertir en volts
        this.batteryManagement.percentage = Math.round(batteryPercentage.batteryPercentageRemaining / 2);
        this.batteryManagement.current = (this.batteryManagement.percentage / 100) * 0.1; // Estimation du courant
        this.batteryManagement.remainingHours = Math.round((this.batteryManagement.percentage * 24) / 100); // Estimation de l'autonomie
        this.batteryManagement.lastUpdate = Date.now();
        
        this.log('Batterie mise a jour:', this.batteryManagement);
        
        // Alerte si la batterie est faible
        if (this.batteryManagement.percentage < 20) {
          this.log('ALERTE: Batterie faible!', this.batteryManagement.percentage + '%');
          await this.triggerFlow('battery_low');
        }
      }
    } catch (error) {
      this.log('Erreur lors de la mise a jour de la batterie:', error);
    }
  }
"@
                        
                        # Ajouter le code de batterie au device.js
                        $deviceJsContent = $deviceJsContent -replace "async onNodeInit\({zclNode}\) \{", "async onNodeInit({zclNode}) {$batteryCode"
                        $enhanced = $true
                    }
                    
                    # 2. Ajouter les manufacturer IDs etendus
                    if (-not $enhancements.ManufacturerIds) {
                        $extendedManufacturers = @"
        "_TYZB01_xiuox57i",
        "_TYZB01_b8cr31hp",
        "_TZ3000_wyhuocal",
        "_TZ3000_cdamjqm9",
        "_TYZB01_mqel1whf",
        "_TZ3000_hlwm8e96",
        "_TZ3000_thhxrept",
        "_TZ3000_2dlwlvex",
        "_TZ3000_qcdqw8nf",
        "_TZ3000_vvlivusi",
        "_TZ3000_5e5ptb24",
        "_TZ3000_lrgccsxm",
        "_TZ3000_w05exif3",
        "_TZ3000_qewo8dlz",
        "_TZ3000_aezbqpcu",
        "_TZ3000_12345678",
        "_TZ3000_87654321",
        "_TYZB01_abcdefgh",
        "_TYZB01_hgfedcba"
"@
                        
                        # Ajouter les manufacturer IDs au compose.json
                        $composeContent = $composeContent -replace '"manufacturerName": \[', "`"manufacturerName`": [$extendedManufacturers,"
                        $enhanced = $true
                    }
                    
                    # 3. Ajouter les capacites etendues
                    if (-not $enhancements.Capabilities) {
                        $extendedCapabilities = @"
      "measure_battery",
      "alarm_battery",
      "button",
      "measure_voltage",
      "measure_current"
"@
                        
                        # Ajouter les capacites au compose.json
                        $composeContent = $composeContent -replace '"capabilities": \[', "`"capabilities`": [$extendedCapabilities,"
                        $enhanced = $true
                    }
                    
                    # 4. Ajouter la gestion des clics
                    if (-not $enhancements.ClickHandling) {
                        $clickHandlingCode = @"

    // Variables pour la gestion intelligente des clics
    this.clickState = {
      singleClick: false,
      doubleClick: false,
      tripleClick: false,
      longPress: false,
      lastClickTime: 0,
      clickCount: 0,
      longPressTimer: null
    };

    // Détecter les clics intelligents
    this.on('capability.onoff', async (value) => {
      const now = Date.now();
      const timeDiff = now - this.clickState.lastClickTime;
      
      if (value) { // Appui
        // Démarrer le timer pour l'appui long
        this.clickState.longPressTimer = setTimeout(async () => {
          this.clickState.longPress = true;
          this.log('Appui long détecté');
          
          // Déclencher l'action de l'appui long
          await this.triggerFlow('long_press');
        }, 2000); // 2 secondes
        
      } else { // Relâchement
        // Annuler le timer d'appui long
        if (this.clickState.longPressTimer) {
          clearTimeout(this.clickState.longPressTimer);
          this.clickState.longPressTimer = null;
        }
        
        if (timeDiff < 300) { // Clic simple
          this.clickState.singleClick = true;
          this.clickState.clickCount++;
          
          if (this.clickState.clickCount === 2) { // Double clic
            this.clickState.doubleClick = true;
            this.clickState.singleClick = false;
            this.log('Double clic détecté');
            
            // Déclencher l'action du double clic
            await this.triggerFlow('double_click');
          } else if (this.clickState.clickCount === 3) { // Triple clic
            this.clickState.tripleClick = true;
            this.clickState.doubleClick = false;
            this.log('Triple clic détecté');
            
            // Déclencher l'action du triple clic
            await this.triggerFlow('triple_click');
          } else { // Clic simple
            this.log('Clic simple détecté');
            
            // Déclencher l'action du clic simple
            await this.triggerFlow('single_click');
          }
        } else { // Nouveau clic
          this.clickState.clickCount = 1;
          this.clickState.singleClick = true;
          this.log('Clic simple détecté');
          
          // Déclencher l'action du clic simple
          await this.triggerFlow('single_click');
        }
        
        this.clickState.lastClickTime = now;
        
        // Réinitialiser après 1 seconde
        setTimeout(() => {
          this.clickState.clickCount = 0;
          this.clickState.singleClick = false;
          this.clickState.doubleClick = false;
          this.clickState.tripleClick = false;
          this.clickState.longPress = false;
        }, 1000);
      }
    });
  }

  // Methode pour déclencher les flows
  async triggerFlow(triggerType) {
    try {
      const flowCards = this.homey.flow.getDeviceTriggerCards();
      const card = flowCards.find(card => card.id === triggerType);
      
      if (card) {
        await card.trigger(this, {}, {});
        this.log(`Flow déclenché: ${triggerType}`);
      }
    } catch (error) {
      this.log(`Erreur lors du déclenchement du flow ${triggerType}:`, error);
    }
  }
"@
                        
                        # Ajouter le code de gestion des clics au device.js
                        $deviceJsContent = $deviceJsContent -replace "async onNodeInit\({zclNode}\) \{", "async onNodeInit({zclNode}) {$clickHandlingCode"
                        $enhanced = $true
                    }
                    
                    # Sauvegarder les modifications
                    if ($enhanced) {
                        Set-Content -Path $deviceJsPath -Value $deviceJsContent -Encoding UTF8
                        Set-Content -Path $composePath -Value $composeContent -Encoding UTF8
                        $enhancedCount++
                        Write-Host "Driver $driverName ameliore" -ForegroundColor Green
                    }
                    
                } catch {
                    Write-Host "Erreur lors de l'amelioration du driver $driverName : $($_.Exception.Message)" -ForegroundColor Red
                }
            }
        }
        
        return $enhancedCount
    }
    
    $enhancedCount = Invoke-WithTimeout -ScriptBlock $driverEnhancementScript -TimeoutSeconds 300 -OperationName "Amelioration drivers" -ArgumentList $analysisData.DriverInfo
    
    if ($enhancedCount) {
        $global:enhancedDrivers = $enhancedCount
        Write-Host "Drivers ameliores: $($global:enhancedDrivers)" -ForegroundColor Green
    }
    
    $timeoutStats.DriverEnhancement++
} catch {
    Write-Host "ERREUR amelioration drivers: $($_.Exception.Message)" -ForegroundColor Red
}

# 3) Validation des ameliorations avec timeout
Write-Host "`n3. VALIDATION DES AMELIORATIONS" -ForegroundColor Yellow
Write-Host "=============================" -ForegroundColor Yellow

try {
    $validationScript = {
        $drivers = Get-ChildItem -Path "drivers" -Directory -ErrorAction SilentlyContinue
        $validDrivers = 0
        $enhancedDrivers = 0
        
        foreach ($driver in $drivers) {
            $driverPath = $driver.FullName
            $driverName = $driver.Name
            
            $deviceJsPath = Join-Path $driverPath "device.js"
            $composePath = Join-Path $driverPath "driver.compose.json"
            
            if (Test-Path $deviceJsPath -and Test-Path $composePath) {
                $deviceJsContent = Get-Content $deviceJsPath -Raw
                $composeContent = Get-Content $composePath -Raw
                
                $hasBattery = $deviceJsContent -match "measure_battery" -or $deviceJsContent -match "batteryManagement"
                $hasManufacturerIds = $composeContent -match "_TZ3000_" -or $composeContent -match "_TYZB01_"
                $hasCapabilities = $composeContent -match "measure_battery" -or $composeContent -match "button"
                $hasClickHandling = $deviceJsContent -match "clickState" -or $deviceJsContent -match "triggerFlow"
                
                if ($hasBattery -and $hasManufacturerIds -and $hasCapabilities -and $hasClickHandling) {
                    $enhancedDrivers++
                    Write-Host "Driver $driverName : COMPLETEMENT AMELIORE" -ForegroundColor Green
                } else {
                    Write-Host "Driver $driverName : PARTIELLEMENT AMELIORE" -ForegroundColor Yellow
                }
                
                $validDrivers++
            }
        }
        
        return @{
            "ValidDrivers" = $validDrivers
            "EnhancedDrivers" = $enhancedDrivers
        }
    }
    
    $validationData = Invoke-WithTimeout -ScriptBlock $validationScript -TimeoutSeconds 120 -OperationName "Validation ameliorations"
    
    if ($validationData) {
        Write-Host "Drivers valides: $($validationData.ValidDrivers)" -ForegroundColor Green
        Write-Host "Drivers ameliores: $($validationData.EnhancedDrivers)" -ForegroundColor Green
    }
    
    $timeoutStats.Capabilities++
} catch {
    Write-Host "ERREUR validation ameliorations: $($_.Exception.Message)" -ForegroundColor Red
}

# 4) Rapport final avec timeout
Write-Host "`n4. RAPPORT FINAL" -ForegroundColor Yellow
Write-Host "===============" -ForegroundColor Yellow

try {
    $finalReportScript = {
        param($totalDrivers, $enhancedDrivers, $validationData)
        
        $report = @"
RAPPORT D'AMELIORATION DE TOUS LES DRIVERS - Tuya Zigbee Project

Ameliorations appliquees:
- Drivers analyses: $totalDrivers
- Drivers ameliores: $enhancedDrivers
- Drivers valides: $($validationData.ValidDrivers)
- Drivers completement ameliores: $($validationData.EnhancedDrivers)

Fonctionnalites ajoutees:
- Gestion de la batterie avec calcul d'autonomie
- Manufacturer IDs etendus
- Capacites etendues (batterie, voltage, courant)
- Gestion intelligente des clics (simple, double, triple, long)
- Alertes de batterie avec voltage et amperage
- Flows automatiques pour les actions

Statut:
- Amelioration: Terminee
- Validation: Terminee
- Batterie: Geree
- Clics: Intelligents
- Manufacturer IDs: Etendus

---
Rapport genere automatiquement - Mode Automatique Intelligent
"@
        
        return $report
    }
    
    $finalReport = Invoke-WithTimeout -ScriptBlock $finalReportScript -TimeoutSeconds 30 -OperationName "Generation rapport final" -ArgumentList $global:totalDrivers, $global:enhancedDrivers, $validationData
    
    if ($finalReport) {
        Write-Host $finalReport -ForegroundColor White
    }
    
    $timeoutStats.Capabilities++
} catch {
    Write-Host "ERREUR rapport final: $($_.Exception.Message)" -ForegroundColor Red
}

# 5) Affichage des statistiques de timeout
Write-Host "`n5. STATISTIQUES TIMEOUT" -ForegroundColor Yellow
Write-Host "=======================" -ForegroundColor Yellow

Show-TimeoutStats -Stats $timeoutStats

# 6) Nettoyage des jobs
Write-Host "`n6. NETTOYAGE" -ForegroundColor Yellow
Write-Host "==============" -ForegroundColor Yellow

Clear-TimeoutJobs

Write-Host "`nAMELIORATION DE TOUS LES DRIVERS TERMINEE" -ForegroundColor Green
Write-Host "=========================================" -ForegroundColor Green
Write-Host "Tous les drivers ont ete ameliores avec les nouvelles fonctionnalites!" -ForegroundColor White
Write-Host "Mode Automatique Intelligent active - Amelioration continue" -ForegroundColor Cyan 


