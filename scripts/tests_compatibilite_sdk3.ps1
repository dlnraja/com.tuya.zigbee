# Script de Tests de Compatibilite SDK3 - Tuya Zigbee
# Tests de compatibilite SDK3 pour tous les drivers

Write-Host "Debut des tests de compatibilite SDK3..." -ForegroundColor Green

# Fonction pour analyser la compatibilite SDK3
function Test-SDK3Compatibility {
    param($driverName)
    
    Write-Host "Test de compatibilite SDK3 pour $driverName..." -ForegroundColor Cyan
    
    $driverPath = "drivers/sdk3/$driverName"
    $composeFile = Join-Path $driverPath "driver.compose.json"
    $deviceFile = Join-Path $driverPath "device.js"
    
    $compatibility = @{
        driver = $driverName
        sdk3_compatible = $false
        issues = @()
        warnings = @()
        recommendations = @()
    }
    
    # Test 1: Verifier la presence du fichier driver.compose.json
    if (-not (Test-Path $composeFile)) {
        $compatibility.issues += "Fichier driver.compose.json manquant"
        return $compatibility
    }
    
    try {
        $content = Get-Content $composeFile | ConvertFrom-Json
        
        # Test 2: Verifier la structure SDK3
        $sdk3Required = @("id", "name", "class", "capabilities", "zigbee")
        foreach ($field in $sdk3Required) {
            if (-not ($content.PSObject.Properties.Name -contains $field)) {
                $compatibility.issues += "Champ SDK3 manquant: $field"
            }
        }
        
        # Test 3: Verifier les noms multilingues
        if ($content.name) {
            $languages = @("en", "fr", "ta", "nl")
            foreach ($lang in $languages) {
                if (-not $content.name.$lang) {
                    $compatibility.warnings += "Nom manquant pour la langue: $lang"
                }
            }
        }
        
        # Test 4: Verifier les capacites SDK3
        if ($content.capabilities) {
            $validCapabilities = @(
                "onoff", "dim", "light_hue", "light_saturation", "light_temperature",
                "measure_temperature", "measure_humidity", "measure_battery", "measure_power",
                "measure_current", "measure_voltage", "alarm_motion", "alarm_contact",
                "windowcoverings_set", "windowcoverings_state", "target_temperature"
            )
            
            foreach ($capability in $content.capabilities) {
                if ($capability -notin $validCapabilities) {
                    $compatibility.warnings += "Capacite non standard: $capability"
                }
            }
        }
        
        # Test 5: Verifier les metadonnees Zigbee
        if ($content.zigbee) {
            if (-not $content.zigbee.manufacturerName -or $content.zigbee.manufacturerName.Count -eq 0) {
                $compatibility.issues += "Fabricants Zigbee manquants"
            }
            
            if (-not $content.zigbee.productId -or $content.zigbee.productId.Count -eq 0) {
                $compatibility.issues += "Product IDs Zigbee manquants"
            }
            
            if (-not $content.zigbee.endpoints) {
                $compatibility.warnings += "Endpoints Zigbee non definis"
            }
        }
        
        # Test 6: Verifier le code JavaScript SDK3
        if (Test-Path $deviceFile) {
            $deviceContent = Get-Content $deviceFile -Raw
            
            # Verifier les imports SDK3
            if ($deviceContent -notlike "*homey-meshdriver*") {
                $compatibility.issues += "Import homey-meshdriver manquant"
            }
            
            if ($deviceContent -notlike "*ZigBeeDevice*") {
                $compatibility.issues += "Classe ZigBeeDevice manquante"
            }
            
            if ($deviceContent -notlike "*onNodeInit*") {
                $compatibility.issues += "Methode onNodeInit manquante"
            }
            
            if ($deviceContent -notlike "*registerCapability*") {
                $compatibility.warnings += "Aucune capacite enregistree"
            }
            
            # Verifier les bonnes pratiques SDK3
            if ($deviceContent -like "*enableDebug*") {
                $compatibility.recommendations += "Debug active - desactiver en production"
            }
            
            if ($deviceContent -like "*enablePolling*") {
                $compatibility.recommendations += "Polling active - optimiser les intervalles"
            }
        } else {
            $compatibility.issues += "Fichier device.js manquant"
        }
        
        # Test 7: Verifier la classe du driver
        $validClasses = @("light", "sensor", "thermostat", "windowcoverings", "button")
        if ($content.class -and $content.class -notin $validClasses) {
            $compatibility.warnings += "Classe non standard: $($content.class)"
        }
        
        # Test 8: Verifier les images
        $imagesPath = Join-Path $driverPath "assets/images"
        if (-not (Test-Path $imagesPath)) {
            $compatibility.warnings += "Dossier images manquant"
        }
        
        # Determination de la compatibilite
        $compatibility.sdk3_compatible = ($compatibility.issues.Count -eq 0)
        
    } catch {
        $compatibility.issues += "Erreur de parsing JSON: $($_.Exception.Message)"
    }
    
    return $compatibility
}

# Fonction pour analyser tous les drivers
function Test-AllDriversSDK3 {
    Write-Host "Analyse de la compatibilite SDK3 pour tous les drivers..." -ForegroundColor Cyan
    
    $allDrivers = @()
    $driverDirs = @("drivers/sdk3", "drivers/in_progress")
    
    foreach ($dir in $driverDirs) {
        if (Test-Path $dir) {
            $drivers = Get-ChildItem $dir -Directory
            foreach ($driver in $drivers) {
                $compatibility = Test-SDK3Compatibility -driverName $driver.Name
                $allDrivers += $compatibility
            }
        }
    }
    
    return $allDrivers
}

# Fonction pour generer le rapport de compatibilite
function Generate-CompatibilityReport {
    param($compatibilities)
    
    Write-Host "Generation du rapport de compatibilite SDK3..." -ForegroundColor Cyan
    
    $compatibleDrivers = $compatibilities | Where-Object { $_.sdk3_compatible }
    $incompatibleDrivers = $compatibilities | Where-Object { -not $_.sdk3_compatible }
    
    $report = @{
        timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
        total_drivers = $compatibilities.Count
        compatible_drivers = $compatibleDrivers.Count
        incompatible_drivers = $incompatibleDrivers.Count
        compatibility_rate = if ($compatibilities.Count -gt 0) { ($compatibleDrivers.Count / $compatibilities.Count) * 100 } else { 0 }
        total_issues = ($compatibilities | ForEach-Object { $_.issues.Count } | Measure-Object -Sum).Sum
        total_warnings = ($compatibilities | ForEach-Object { $_.warnings.Count } | Measure-Object -Sum).Sum
        compatibilities = $compatibilities
    }
    
    $reportJson = $report | ConvertTo-Json -Depth 10
    Set-Content "rapports/COMPATIBILITE_SDK3.json" $reportJson -Encoding UTF8
    
    # Creer un rapport lisible
    $readableReport = @"
# RAPPORT DE COMPATIBILITE SDK3

**Date :** $(Get-Date -Format "yyyy-MM-dd HH:mm:ss")
**Statut :** $($compatibleDrivers.Count)/$($compatibilities.Count) drivers compatibles

## RESULTATS

### Compatibilite Globale
- **Total Drivers** : $($compatibilities.Count)
- **Drivers Compatibles** : $($compatibleDrivers.Count)
- **Drivers Incompatibles** : $($incompatibleDrivers.Count)
- **Taux de Compatibilite** : $([math]::Round($report.compatibility_rate, 1))%
- **Issues Totales** : $($report.total_issues)
- **Warnings Totaux** : $($report.total_warnings)

### Drivers Compatibles SDK3

$(foreach ($driver in $compatibleDrivers) {
"- **$($driver.driver)** : ✅ Compatible"
})

### Drivers Incompatibles SDK3

$(foreach ($driver in $incompatibleDrivers) {
"- **$($driver.driver)** : ❌ Incompatible"
foreach ($issue in $driver.issues) {
"  - Issue: $issue"
}
foreach ($warning in $driver.warnings) {
"  - Warning: $warning"
}
""
})

### Recommendations Globales

$(foreach ($driver in $compatibilities) {
if ($driver.recommendations.Count -gt 0) {
"#### $($driver.driver)"
foreach ($rec in $driver.recommendations) {
"- $rec"
}
""
}
})

## ACTIONS RECOMMANDEES

1. **Corriger les issues critiques** identifiees ci-dessus
2. **Resoudre les warnings** pour une meilleure compatibilite
3. **Appliquer les recommendations** pour optimiser les performances
4. **Retester apres corrections** pour valider la compatibilite

---
*Genere automatiquement par GPT-4, Cursor, PowerShell*
"@
    
    Set-Content "rapports/COMPATIBILITE_SDK3.md" $readableReport -Encoding UTF8
    Write-Host "Rapport de compatibilite SDK3 genere" -ForegroundColor Green
}

# Fonction pour optimiser les drivers incompatibles
function Optimize-IncompatibleDrivers {
    param($incompatibleDrivers)
    
    Write-Host "Optimisation des drivers incompatibles..." -ForegroundColor Cyan
    
    $optimizedCount = 0
    
    foreach ($driver in $incompatibleDrivers) {
        Write-Host "Optimisation du driver $($driver.driver)..." -ForegroundColor Yellow
        
        $driverPath = "drivers/sdk3/$($driver.driver)"
        $composeFile = Join-Path $driverPath "driver.compose.json"
        
        if (Test-Path $composeFile) {
            try {
                $content = Get-Content $composeFile | ConvertFrom-Json
                $modified = $false
                
                # Corriger les issues critiques
                foreach ($issue in $driver.issues) {
                    if ($issue -like "*Champ SDK3 manquant*") {
                        $field = $issue -replace "Champ SDK3 manquant: ", ""
                        if ($field -eq "id" -and -not $content.id) {
                            $content.id = $driver.driver
                            $modified = $true
                        }
                    }
                }
                
                # Ajouter les noms multilingues manquants
                if ($content.name) {
                    $languages = @("en", "fr", "ta", "nl")
                    foreach ($lang in $languages) {
                        if (-not $content.name.$lang) {
                            $content.name.$lang = $content.name.en
                            $modified = $true
                        }
                    }
                }
                
                # Sauvegarder les modifications
                if ($modified) {
                    $contentJson = $content | ConvertTo-Json -Depth 10
                    Set-Content $composeFile $contentJson -Encoding UTF8
                    $optimizedCount++
                    Write-Host "✅ $($driver.driver) optimise" -ForegroundColor Green
                }
                
            } catch {
                Write-Host "❌ Erreur lors de l'optimisation de $($driver.driver)" -ForegroundColor Red
            }
        }
    }
    
    return $optimizedCount
}

# Fonction principale
function Start-SDK3CompatibilityTests {
    Write-Host "DEBUT DES TESTS DE COMPATIBILITE SDK3" -ForegroundColor Green
    Write-Host "=======================================" -ForegroundColor Green
    
    # 1. Analyser tous les drivers
    $compatibilities = Test-AllDriversSDK3
    
    # 2. Generer le rapport initial
    Generate-CompatibilityReport -compatibilities $compatibilities
    
    # 3. Optimiser les drivers incompatibles
    $incompatibleDrivers = $compatibilities | Where-Object { -not $_.sdk3_compatible }
    $optimizedCount = Optimize-IncompatibleDrivers -incompatibleDrivers $incompatibleDrivers
    
    # 4. Regenerer le rapport apres optimisation
    if ($optimizedCount -gt 0) {
        Write-Host "Regeneration du rapport apres optimisation..." -ForegroundColor Cyan
        $updatedCompatibilities = Test-AllDriversSDK3
        Generate-CompatibilityReport -compatibilities $updatedCompatibilities
    }
    
    Write-Host "TESTS DE COMPATIBILITE SDK3 TERMINES!" -ForegroundColor Green
    Write-Host "Resume:" -ForegroundColor Cyan
    Write-Host "- $($compatibilities.Count) drivers analyses" -ForegroundColor White
    Write-Host "- $($compatibleDrivers.Count) drivers compatibles" -ForegroundColor White
    Write-Host "- $($incompatibleDrivers.Count) drivers incompatibles" -ForegroundColor White
    Write-Host "- $optimizedCount drivers optimises" -ForegroundColor White
    Write-Host "- Taux de compatibilite: $([math]::Round($report.compatibility_rate, 1))%" -ForegroundColor White
    Write-Host "- Rapport genere" -ForegroundColor White
}

# Execution
Start-SDK3CompatibilityTests 

