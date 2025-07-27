# Zigbee Referencial Creator - Tuya Zigbee Project
# Mode enrichissement additif - Granularité fine

Write-Host "ZIGBEE REFERENCIAL CREATOR - MODE ENRICHISSEMENT" -ForegroundColor Green
Write-Host "Mode enrichissement additif - Granularité fine" -ForegroundColor Yellow

# Sources Zigbee officielles
$sources = @{
    "Espressif" = "https://docs.espressif.com/projects/esp-zigbee-sdk/en/latest/esp32/user-guide/zcl_custom.html"
    "Zigbee Alliance" = "https://zigbeealliance.org/wp-content/uploads/2019/12/07-5123-06-zigbee-cluster-library-specification.pdf"
    "CSA IoT" = "https://csa-iot.org/"
    "NXP" = "https://www.nxp.com/docs/en/user-guide/JN-UG-3115.pdf"
    "Microchip" = "https://onlinedocs.microchip.com/oxy/GUID-D176AD05-7AEE-4A67-B5B2-16E9E7E7FAC8-en-US-1/GUID-20DDCF41-97FD-4FBB-AC06-7E6A033D6FEB.html"
    "Silicon Labs" = "https://docs.silabs.com/zigbee/8.2.1/zigbee-fundamentals/06-zigbee-cluster-library"
    "GitHub Silicon Labs" = "https://github.com/SiliconLabsSoftware/zigbee_applications/blob/master/zigbee_concepts/Zigbee-Introduction/Zigbee%20Introduction%20-%20Clusters,%20Endpoints,%20Device%20Types.md"
}

# Clusters Zigbee de base
$basicClusters = @{
    "Basic" = @{
        "ID" = "0x0000"
        "Description" = "Basic cluster for device information"
        "Attributes" = @("ZCLVersion", "ApplicationVersion", "StackVersion", "HWVersion", "ManufacturerName", "ModelIdentifier", "DateCode", "PowerSource")
    }
    "Power Configuration" = @{
        "ID" = "0x0001"
        "Description" = "Power configuration and monitoring"
        "Attributes" = @("MainsVoltage", "MainsFrequency", "MainsAlarmMask", "MainsVoltageMinThreshold", "MainsVoltageMaxThreshold")
    }
    "Device Temperature Configuration" = @{
        "ID" = "0x0002"
        "Description" = "Device temperature monitoring"
        "Attributes" = @("CurrentTemperature", "MinTempExperienced", "MaxTempExperienced", "OverTempTotalDwell")
    }
}

# Clusters Lighting
$lightingClusters = @{
    "On/Off" = @{
        "ID" = "0x0006"
        "Description" = "On/Off control for lights and switches"
        "Attributes" = @("OnOff", "GlobalSceneControl", "OnTime", "OffWaitTime")
    }
    "Level Control" = @{
        "ID" = "0x0008"
        "Description" = "Dimmer control for lights"
        "Attributes" = @("CurrentLevel", "RemainingTime", "OnOffTransitionTime", "OnLevel", "OnTransitionTime", "OffTransitionTime", "DefaultMoveRate")
    }
    "Color Control" = @{
        "ID" = "0x0300"
        "Description" = "Color control for RGB lights"
        "Attributes" = @("CurrentHue", "CurrentSaturation", "RemainingTime", "CurrentX", "CurrentY", "ColorTemperature", "ColorMode")
    }
}

# Clusters HVAC
$hvacClusters = @{
    "Thermostat" = @{
        "ID" = "0x0201"
        "Description" = "Thermostat control"
        "Attributes" = @("LocalTemperature", "OccupiedCoolingSetpoint", "OccupiedHeatingSetpoint", "ControlSequenceOfOperation", "SystemMode")
    }
    "Fan Control" = @{
        "ID" = "0x0202"
        "Description" = "Fan control for HVAC systems"
        "Attributes" = @("FanMode", "FanModeSequence", "OccupiedCoolingSetpoint", "OccupiedHeatingSetpoint")
    }
}

# Clusters Security
$securityClusters = @{
    "IAS Zone" = @{
        "ID" = "0x0500"
        "Description" = "Intruder Alarm System zone control"
        "Attributes" = @("ZoneState", "ZoneType", "ZoneStatus", "IASCIEAddress", "ZoneID")
    }
    "IAS WD" = @{
        "ID" = "0x0502"
        "Description" = "Warning Device for security systems"
        "Attributes" = @("MaxDuration", "SquawkInfo")
    }
}

# Fonction de création des fichiers de référentiel
function Create-ZigbeeReferencial {
    Write-Host "Création du référentiel Zigbee..." -ForegroundColor Cyan
    
    # Créer le fichier principal des clusters
    $clustersContent = @"
# Zigbee Clusters Referential
# Generated: $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')
# Mode: Enrichissement additif

## Basic Clusters
"@
    
    foreach ($cluster in $basicClusters.GetEnumerator()) {
        $clustersContent += "`n### $($cluster.Key)`n"
        $clustersContent += "- **ID**: $($cluster.Value.ID)`n"
        $clustersContent += "- **Description**: $($cluster.Value.Description)`n"
        $clustersContent += "- **Attributes**: $($cluster.Value.Attributes -join ', ')`n"
    }
    
    $clustersContent += "`n## Lighting Clusters`n"
    foreach ($cluster in $lightingClusters.GetEnumerator()) {
        $clustersContent += "`n### $($cluster.Key)`n"
        $clustersContent += "- **ID**: $($cluster.Value.ID)`n"
        $clustersContent += "- **Description**: $($cluster.Value.Description)`n"
        $clustersContent += "- **Attributes**: $($cluster.Value.Attributes -join ', ')`n"
    }
    
    $clustersContent += "`n## HVAC Clusters`n"
    foreach ($cluster in $hvacClusters.GetEnumerator()) {
        $clustersContent += "`n### $($cluster.Key)`n"
        $clustersContent += "- **ID**: $($cluster.Value.ID)`n"
        $clustersContent += "- **Description**: $($cluster.Value.Description)`n"
        $clustersContent += "- **Attributes**: $($cluster.Value.Attributes -join ', ')`n"
    }
    
    $clustersContent += "`n## Security Clusters`n"
    foreach ($cluster in $securityClusters.GetEnumerator()) {
        $clustersContent += "`n### $($cluster.Key)`n"
        $clustersContent += "- **ID**: $($cluster.Value.ID)`n"
        $clustersContent += "- **Description**: $($cluster.Value.Description)`n"
        $clustersContent += "- **Attributes**: $($cluster.Value.Attributes -join ', ')`n"
    }
    
    # Sauvegarder le fichier
    Set-Content -Path "docs/referentials/zigbee-clusters/clusters/zigbee-clusters-reference.md" -Value $clustersContent -Encoding UTF8
    Write-Host "[OK] Référentiel clusters créé" -ForegroundColor Green
    
    # Créer le fichier des sources
    $sourcesContent = @"
# Sources Zigbee Officielles
# Mise à jour mensuelle automatique

## Sources Web
"@
    
    foreach ($source in $sources.GetEnumerator()) {
        $sourcesContent += "`n### $($source.Key)`n"
        $sourcesContent += "- **URL**: $($source.Value)`n"
        $sourcesContent += "- **Dernière mise à jour**: $(Get-Date -Format 'yyyy-MM-dd')`n"
    }
    
    Set-Content -Path "docs/referentials/zigbee-clusters/sources.md" -Value $sourcesContent -Encoding UTF8
    Write-Host "[OK] Sources documentées" -ForegroundColor Green
}

# Fonction de création des templates
function Create-ZigbeeTemplates {
    Write-Host "Création des templates Zigbee..." -ForegroundColor Cyan
    
    # Template Legacy
    $legacyTemplate = @"
# Template Legacy - Zigbee Device
# Compatible avec anciens devices Tuya

module.exports = {
    id: 'legacy_device',
    name: 'Legacy Device',
    icon: '/assets/legacy.svg',
    capabilities: ['onoff'],
    capabilitiesOptions: {
        onoff: {
            title: {
                en: 'On/Off',
                fr: 'Marche/Arrêt'
            }
        }
    },
    cluster: 'genOnOff',
    attributes: {
        onOff: { id: 0, type: 'boolean' }
    }
};
"@
    
    Set-Content -Path "docs/referentials/zigbee-clusters/templates/legacy-template.js" -Value $legacyTemplate -Encoding UTF8
    
    # Template Generic
    $genericTemplate = @"
# Template Generic - Zigbee Device
# Support maximum de compatibilité

module.exports = {
    id: 'generic_device',
    name: 'Generic Device',
    icon: '/assets/generic.svg',
    capabilities: ['onoff', 'dim', 'light_hue', 'light_saturation', 'light_temperature'],
    capabilitiesOptions: {
        onoff: {
            title: {
                en: 'On/Off',
                fr: 'Marche/Arrêt'
            }
        },
        dim: {
            title: {
                en: 'Dimmer',
                fr: 'Variateur'
            }
        }
    },
    clusters: {
        genOnOff: {
            attributes: {
                onOff: { id: 0, type: 'boolean' }
            }
        },
        genLevelCtrl: {
            attributes: {
                currentLevel: { id: 0, type: 'number' }
            }
        },
        lightingColorCtrl: {
            attributes: {
                currentHue: { id: 0, type: 'number' },
                currentSaturation: { id: 1, type: 'number' },
                currentX: { id: 3, type: 'number' },
                currentY: { id: 4, type: 'number' }
            }
        }
    }
};
"@
    
    Set-Content -Path "docs/referentials/zigbee-clusters/templates/generic-template.js" -Value $genericTemplate -Encoding UTF8
    
    # Template Custom
    $customTemplate = @"
# Template Custom - Zigbee Device
# Pour devices spécifiques Tuya

module.exports = {
    id: 'custom_device',
    name: 'Custom Device',
    icon: '/assets/custom.svg',
    capabilities: ['onoff', 'dim', 'measure_temperature', 'measure_humidity'],
    capabilitiesOptions: {
        onoff: {
            title: {
                en: 'On/Off',
                fr: 'Marche/Arrêt'
            }
        },
        dim: {
            title: {
                en: 'Dimmer',
                fr: 'Variateur'
            }
        },
        measure_temperature: {
            title: {
                en: 'Temperature',
                fr: 'Température'
            }
        },
        measure_humidity: {
            title: {
                en: 'Humidity',
                fr: 'Humidité'
            }
        }
    },
    clusters: {
        genOnOff: {
            attributes: {
                onOff: { id: 0, type: 'boolean' }
            }
        },
        genLevelCtrl: {
            attributes: {
                currentLevel: { id: 0, type: 'number' }
            }
        },
        msTemperatureMeasurement: {
            attributes: {
                measuredValue: { id: 0, type: 'number' }
            }
        },
        msRelativeHumidity: {
            attributes: {
                measuredValue: { id: 0, type: 'number' }
            }
        }
    }
};
"@
    
    Set-Content -Path "docs/referentials/zigbee-clusters/templates/custom-template.js" -Value $customTemplate -Encoding UTF8
    
    Write-Host "[OK] Templates créés" -ForegroundColor Green
}

# Fonction de création du fichier .homeyignore
function Create-HomeyIgnore {
    Write-Host "Création du fichier .homeyignore..." -ForegroundColor Cyan
    
    $homeyIgnoreContent = @"
# Homey Ignore - Optimisation pour déploiement
# Fichiers non nécessaires pour Homey CLI

# Documentation de développement
docs/referentials/zigbee-clusters/data/scraped/
docs/referentials/zigbee-clusters/data/processed/
*.md
!README.md
!CHANGELOG.md

# Scripts de développement
scripts/
*.ps1
*.sh

# Workflows GitHub
.github/workflows/
*.yml

# Logs et rapports
logs/
rapports/
*.log

# Fichiers temporaires
*.tmp
*.temp
*.bak

# Documentation technique
docs/enhanced/
docs/reports/

# Tests
test/
tests/
*.test.js

# Configuration de développement
.vscode/
.idea/
*.config.js

# Assets non utilisés
assets/unused/
images/old/
"@
    
    Set-Content -Path ".homeyignore" -Value $homeyIgnoreContent -Encoding UTF8
    Write-Host "[OK] Fichier .homeyignore créé" -ForegroundColor Green
}

# Exécution principale
Write-Host "Début de la création du référentiel Zigbee..." -ForegroundColor Green

# 1. Créer le référentiel
Create-ZigbeeReferencial

# 2. Créer les templates
Create-ZigbeeTemplates

# 3. Créer le fichier .homeyignore
Create-HomeyIgnore

# Rapport final
Write-Host "`n📊 RAPPORT FINAL ZIGBEE REFERENCIAL" -ForegroundColor Magenta
Write-Host "=====================================" -ForegroundColor Gray
Write-Host "✅ Référentiel clusters créé" -ForegroundColor Green
Write-Host "✅ Templates générés (Legacy, Generic, Custom)" -ForegroundColor Green
Write-Host "✅ Fichier .homeyignore optimisé" -ForegroundColor Green
Write-Host "✅ Sources documentées" -ForegroundColor Green

Write-Host "`n🎉 RÉFÉRENTIEL ZIGBEE CRÉÉ AVEC SUCCÈS" -ForegroundColor Green
Write-Host "Mode enrichissement additif appliqué" -ForegroundColor Yellow 
