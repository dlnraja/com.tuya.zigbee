# Script de Validation des Drivers - Tuya Zigbee
# Validation manuelle des 21 nouveaux drivers crees

Write-Host "Debut de la validation des drivers..." -ForegroundColor Green

# Liste des nouveaux drivers a valider
$NEW_DRIVERS = @(
    "switch_4_gang", "dimmer_3_gang", "smart_plug_2_socket", "smart_plug_4_socket",
    "pir_sensor", "temperature_sensor", "humidity_sensor", "door_window_sensor",
    "flood_sensor", "curtain_switch", "blind_motor", "thermostat", "radiator_valve",
    "irrigation_controller", "buzzer", "alarm_sensor", "fingerbot", "button_switch",
    "relay_board", "power_strip", "outdoor_plug"
)

# Fonction de validation de la structure
function Validate-DriverStructure {
    param($driverName)
    
    Write-Host "Validation de la structure pour $driverName..." -ForegroundColor Cyan
    
    $driverPath = "drivers/sdk3/$driverName"
    $validation = @{
        driver = $driverName
        structure_valid = $false
        files_present = @()
        errors = @()
    }
    
    # Verifier l'existence du dossier
    if (-not (Test-Path $driverPath)) {
        $validation.errors += "Dossier driver manquant"
        return $validation
    }
    
    # Verifier les fichiers requis
    $requiredFiles = @(
        "driver.compose.json",
        "device.js",
        "driver.js",
        "assets/icon.svg"
    )
    
    foreach ($file in $requiredFiles) {
        $filePath = Join-Path $driverPath $file
        if (Test-Path $filePath) {
            $validation.files_present += $file
        } else {
            $validation.errors += "Fichier manquant: $file"
        }
    }
    
    # Verifier la structure des dossiers
    $requiredDirs = @("assets", "assets/images")
    foreach ($dir in $requiredDirs) {
        $dirPath = Join-Path $driverPath $dir
        if (-not (Test-Path $dirPath)) {
            $validation.errors += "Dossier manquant: $dir"
        }
    }
    
    $validation.structure_valid = ($validation.errors.Count -eq 0)
    return $validation
}

# Fonction de validation du JSON
function Validate-DriverJSON {
    param($driverName)
    
    Write-Host "Validation du JSON pour $driverName..." -ForegroundColor Cyan
    
    $driverPath = "drivers/sdk3/$driverName"
    $composeFile = Join-Path $driverPath "driver.compose.json"
    
    $validation = @{
        driver = $driverName
        json_valid = $false
        required_fields = @()
        missing_fields = @()
        errors = @()
    }
    
    if (-not (Test-Path $composeFile)) {
        $validation.errors += "Fichier driver.compose.json manquant"
        return $validation
    }
    
    try {
        $content = Get-Content $composeFile | ConvertFrom-Json
        
        # Verifier les champs requis
        $requiredFields = @("id", "name", "class", "capabilities", "zigbee")
        foreach ($field in $requiredFields) {
            if ($content.PSObject.Properties.Name -contains $field) {
                $validation.required_fields += $field
            } else {
                $validation.missing_fields += $field
            }
        }
        
        # Verifier les noms multilingues
        if ($content.name) {
            $languages = @("en", "fr", "ta", "nl")
            foreach ($lang in $languages) {
                if (-not $content.name.$lang) {
                    $validation.errors += "Nom manquant pour la langue: $lang"
                }
            }
        }
        
        # Verifier les capacites
        if ($content.capabilities -and $content.capabilities.Count -gt 0) {
            $validation.required_fields += "capabilities"
        } else {
            $validation.errors += "Aucune capacite definie"
        }
        
        # Verifier les metadonnees Zigbee
        if ($content.zigbee) {
            if ($content.zigbee.manufacturerName -and $content.zigbee.manufacturerName.Count -gt 0) {
                $validation.required_fields += "manufacturerName"
            } else {
                $validation.errors += "Fabricants manquants"
            }
            
            if ($content.zigbee.productId -and $content.zigbee.productId.Count -gt 0) {
                $validation.required_fields += "productId"
            } else {
                $validation.errors += "Product IDs manquants"
            }
        } else {
            $validation.errors += "Metadonnees Zigbee manquantes"
        }
        
        $validation.json_valid = ($validation.errors.Count -eq 0)
        
    } catch {
        $validation.errors += "Erreur de parsing JSON: $($_.Exception.Message)"
    }
    
    return $validation
}

# Fonction de validation du code JavaScript
function Validate-DriverJavaScript {
    param($driverName)
    
    Write-Host "Validation du JavaScript pour $driverName..." -ForegroundColor Cyan
    
    $driverPath = "drivers/sdk3/$driverName"
    $deviceFile = Join-Path $driverPath "device.js"
    $driverFile = Join-Path $driverPath "driver.js"
    
    $validation = @{
        driver = $driverName
        js_valid = $false
        device_js_valid = $false
        driver_js_valid = $false
        errors = @()
    }
    
    # Verifier device.js
    if (Test-Path $deviceFile) {
        try {
            $deviceContent = Get-Content $deviceFile -Raw
            
            # Verifier la presence des elements requis
            $requiredElements = @(
                "ZigBeeDevice",
                "onNodeInit",
                "registerCapability",
                "enableDebug",
                "enablePolling"
            )
            
            foreach ($element in $requiredElements) {
                if ($deviceContent -like "*$element*") {
                    $validation.device_js_valid = $true
                } else {
                    $validation.errors += "Element manquant dans device.js: $element"
                }
            }
        } catch {
            $validation.errors += "Erreur lors de la lecture de device.js"
        }
    } else {
        $validation.errors += "Fichier device.js manquant"
    }
    
    # Verifier driver.js
    if (Test-Path $driverFile) {
        try {
            $driverContent = Get-Content $driverFile -Raw
            
            # Verifier la presence des elements requis
            $requiredElements = @(
                "ZigBeeDriver",
                "onMeshInit"
            )
            
            foreach ($element in $requiredElements) {
                if ($driverContent -like "*$element*") {
                    $validation.driver_js_valid = $true
                } else {
                    $validation.errors += "Element manquant dans driver.js: $element"
                }
            }
        } catch {
            $validation.errors += "Erreur lors de la lecture de driver.js"
        }
    } else {
        $validation.errors += "Fichier driver.js manquant"
    }
    
    $validation.js_valid = ($validation.device_js_valid -and $validation.driver_js_valid)
    return $validation
}

# Fonction de validation des icones
function Validate-DriverIcons {
    param($driverName)
    
    Write-Host "Validation des icones pour $driverName..." -ForegroundColor Cyan
    
    $driverPath = "drivers/sdk3/$driverName"
    $iconFile = Join-Path $driverPath "assets/icon.svg"
    
    $validation = @{
        driver = $driverName
        icon_valid = $false
        icon_size = 0
        errors = @()
    }
    
    if (Test-Path $iconFile) {
        try {
            $iconContent = Get-Content $iconFile -Raw
            $validation.icon_size = $iconContent.Length
            
            # Verifier la presence des elements SVG requis
            $requiredElements = @(
                "svg",
                "xmlns",
                "viewBox"
            )
            
            foreach ($element in $requiredElements) {
                if ($iconContent -like "*$element*") {
                    $validation.icon_valid = $true
                } else {
                    $validation.errors += "Element SVG manquant: $element"
                }
            }
        } catch {
            $validation.errors += "Erreur lors de la lecture de l'icone"
        }
    } else {
        $validation.errors += "Fichier icon.svg manquant"
    }
    
    return $validation
}

# Fonction de validation complete d'un driver
function Validate-CompleteDriver {
    param($driverName)
    
    Write-Host "Validation complete du driver $driverName..." -ForegroundColor Yellow
    
    $structureValidation = Validate-DriverStructure -driverName $driverName
    $jsonValidation = Validate-DriverJSON -driverName $driverName
    $jsValidation = Validate-DriverJavaScript -driverName $driverName
    $iconValidation = Validate-DriverIcons -driverName $driverName
    
    $completeValidation = @{
        driver = $driverName
        structure = $structureValidation
        json = $jsonValidation
        javascript = $jsValidation
        icon = $iconValidation
        overall_valid = $false
        total_errors = 0
    }
    
    # Compter les erreurs totales
    $allErrors = @()
    $allErrors += $structureValidation.errors
    $allErrors += $jsonValidation.errors
    $allErrors += $jsValidation.errors
    $allErrors += $iconValidation.errors
    
    $completeValidation.total_errors = $allErrors.Count
    $completeValidation.overall_valid = ($allErrors.Count -eq 0)
    
    return $completeValidation
}

# Fonction de generation du rapport de validation
function Generate-ValidationReport {
    param($validations)
    
    Write-Host "Generation du rapport de validation..." -ForegroundColor Cyan
    
    $report = @{
        timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
        total_drivers = $validations.Count
        valid_drivers = ($validations | Where-Object { $_.overall_valid }).Count
        invalid_drivers = ($validations | Where-Object { -not $_.overall_valid }).Count
        success_rate = if ($validations.Count -gt 0) { (($validations | Where-Object { $_.overall_valid }).Count / $validations.Count) * 100 } else { 0 }
        total_errors = ($validations | ForEach-Object { $_.total_errors } | Measure-Object -Sum).Sum
        validations = $validations
    }
    
    $reportJson = $report | ConvertTo-Json -Depth 10
    Set-Content "docs/reports/VALIDATION_DRIVERS.json" $reportJson -Encoding UTF8
    
    # Creer un rapport lisible
    $readableReport = @"
# RAPPORT DE VALIDATION DES DRIVERS

**Date :** $(Get-Date -Format "yyyy-MM-dd HH:mm:ss")
**Statut :** $($report.valid_drivers)/$($report.total_drivers) drivers valides

## RESULTATS

### Validation Globale
- **Total Drivers** : $($report.total_drivers)
- **Drivers Valides** : $($report.valid_drivers)
- **Drivers Invalides** : $($report.invalid_drivers)
- **Taux de Succes** : $([math]::Round($report.success_rate, 1))%
- **Erreurs Totales** : $($report.total_errors)

### Details par Driver

$(foreach ($validation in $validations) {
"- **$($validation.driver)** : $(if ($validation.overall_valid) { '✅ VALIDE' } else { '❌ INVALIDE' }) ($($validation.total_errors) erreurs)"
})

### Erreurs Detaillees

$(foreach ($validation in $validations | Where-Object { -not $_.overall_valid }) {
"#### $($validation.driver)"
foreach ($err in $validation.structure.errors) {
"- Structure: $err"
}
foreach ($err in $validation.json.errors) {
"- JSON: $err"
}
foreach ($err in $validation.javascript.errors) {
"- JavaScript: $err"
}
foreach ($err in $validation.icon.errors) {
"- Icone: $err"
}
""
})

## RECOMMANDATIONS

1. **Corriger les erreurs** identifiees ci-dessus
2. **Retester les drivers** apres correction
3. **Valider la compatibilite** SDK3
4. **Optimiser les performances** si necessaire

---
*Genere automatiquement par GPT-4, Cursor, PowerShell*
"@
    
    Set-Content "docs/reports/VALIDATION_DRIVERS.md" $readableReport -Encoding UTF8
    Write-Host "Rapport de validation genere" -ForegroundColor Green
}

# Fonction principale
function Start-ValidationDrivers {
    Write-Host "DEBUT DE LA VALIDATION DES DRIVERS" -ForegroundColor Green
    Write-Host "===================================" -ForegroundColor Green
    
    $validations = @()
    
    foreach ($driver in $NEW_DRIVERS) {
        Write-Host "Validation du driver $driver..." -ForegroundColor Yellow
        $validation = Validate-CompleteDriver -driverName $driver
        $validations += $validation
        
        if ($validation.overall_valid) {
            Write-Host "✅ $driver : VALIDE" -ForegroundColor Green
        } else {
            Write-Host "❌ $driver : INVALIDE ($($validation.total_errors) erreurs)" -ForegroundColor Red
        }
    }
    
    # Generer le rapport
    Generate-ValidationReport -validations $validations
    
    Write-Host "VALIDATION DES DRIVERS TERMINEE!" -ForegroundColor Green
    Write-Host "Resume:" -ForegroundColor Cyan
    Write-Host "- $($validations.Count) drivers valides" -ForegroundColor White
    Write-Host "- $($report.valid_drivers) drivers valides" -ForegroundColor White
    Write-Host "- $($report.invalid_drivers) drivers invalides" -ForegroundColor White
    Write-Host "- Taux de succes: $([math]::Round($report.success_rate, 1))%" -ForegroundColor White
    Write-Host "- Rapport genere" -ForegroundColor White
}

# Execution
Start-ValidationDrivers 


