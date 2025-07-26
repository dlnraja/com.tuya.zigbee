
---
**📅 Version**: 1.0.0
**📅 Date**: 2025-07-26
**🕐 Heure**: 16:49:40
**🎯 Objectif**: Intégration locale Tuya Zigbee
**🚀 Mode**: Priorité locale
**🛡️ Sécurité**: Mode local complet
---
# 🚀 Script de Génération Automatique de la Liste des Drivers
# Mode Automatique Intelligent - Génération automatique

param(
    [string]$DriversPath = "drivers",
    [string]$AppJsonPath = "app.json",
    [switch]$Verbose
)

Write-Host "🚀 GÉNÉRATION AUTOMATIQUE DE LA LISTE DES DRIVERS" -ForegroundColor Green
Write-Host "Mode Automatique Intelligent activé" -ForegroundColor Yellow

# Fonction pour analyser un driver
function Analyze-Driver {
    param(
        [string]$DriverPath
    )
    
    $driverName = Split-Path $DriverPath -Leaf
    $deviceFile = Join-Path $DriverPath "device.js"
    $driverFile = Join-Path $DriverPath "driver.js"
    
    $driverInfo = @{
        name = $driverName
        path = $DriverPath
        hasDevice = Test-Path $deviceFile
        hasDriver = Test-Path $driverFile
        capabilities = @()
        manufacturerIds = @()
    }
    
    # Analyser le fichier device.js
    if (Test-Path $deviceFile) {
        $deviceContent = Get-Content $deviceFile -Raw
        $driverInfo.hasDevice = $true
        
        # Extraire les capabilities
        if ($deviceContent -match "registerCapability\('([^']+)'") {
            $driverInfo.capabilities = ($deviceContent | Select-String "registerCapability\('([^']+)'" -AllMatches).Matches | ForEach-Object { $_.Groups[1].Value } | Select-Object -Unique
        }
        
        # Extraire les manufacturer IDs
        if ($deviceContent -match "manufacturerId.*?(\d+)") {
            $driverInfo.manufacturerIds = ($deviceContent | Select-String "manufacturerId.*?(\d+)" -AllMatches).Matches | ForEach-Object { $_.Groups[1].Value } | Select-Object -Unique
        }
    }
    
    return $driverInfo
}

# Fonction pour générer l'entrée driver dans app.json
function Generate-DriverEntry {
    param(
        [hashtable]$DriverInfo
    )
    
    $entry = @{
        id = $DriverInfo.name
        name = @{
            en = $DriverInfo.name -replace "_", " " -replace "-", " "
            fr = $DriverInfo.name -replace "_", " " -replace "-", " "
            de = $DriverInfo.name -replace "_", " " -replace "-", " "
            es = $DriverInfo.name -replace "_", " " -replace "-", " "
            it = $DriverInfo.name -replace "_", " " -replace "-", " "
            nl = $DriverInfo.name -replace "_", " " -replace "-", " "
        }
        description = @{
            en = "Tuya Zigbee $($DriverInfo.name -replace "_", " " -replace "-", " ") device with intelligent automation"
            fr = "Appareil Tuya Zigbee $($DriverInfo.name -replace "_", " " -replace "-", " ") avec automatisation intelligente"
            de = "Tuya Zigbee $($DriverInfo.name -replace "_", " " -replace "-", " ") Gerät mit intelligenter Automatisierung"
            es = "Dispositivo Tuya Zigbee $($DriverInfo.name -replace "_", " " -replace "-", " ") con automatización inteligente"
            it = "Dispositivo Tuya Zigbee $($DriverInfo.name -replace "_", " " -replace "-", " ") con automazione intelligente"
            nl = "Tuya Zigbee $($DriverInfo.name -replace "_", " " -replace "-", " ") apparaat met intelligente automatisering"
        }
        images = @{
            small = "assets/icon.svg"
            large = "assets/icon.svg"
        }
        capabilities = $DriverInfo.capabilities
        capabilityOptions = @{}
        settings = @()
    }
    
    return $entry
}

# Fonction principale
function Start-DriverGeneration {
    Write-Host "📁 Analyse du dossier drivers..." -ForegroundColor Cyan
    
    if (-not (Test-Path $DriversPath)) {
        Write-Host "❌ Dossier drivers non trouvé: $DriversPath" -ForegroundColor Red
        return
    }
    
    # Récupérer tous les dossiers de drivers
    $driverFolders = Get-ChildItem -Path $DriversPath -Directory | Where-Object { 
        $_.Name -notmatch "^(history|backup|temp)" 
    }
    
    Write-Host "🔍 Trouvé $($driverFolders.Count) drivers" -ForegroundColor Green
    
    $driversList = @()
    $processedCount = 0
    
    foreach ($folder in $driverFolders) {
        $processedCount++
        Write-Progress -Activity "Analyse des drivers" -Status "Traitement de $($folder.Name)" -PercentComplete (($processedCount / $driverFolders.Count) * 100)
        
        $driverInfo = Analyze-Driver -DriverPath $folder.FullName
        $driverEntry = Generate-DriverEntry -DriverInfo $driverInfo
        
        $driversList += $driverEntry
        
        if ($Verbose) {
            Write-Host "  ✅ $($folder.Name) - Capabilities: $($driverInfo.capabilities.Count), Manufacturer IDs: $($driverInfo.manufacturerIds.Count)" -ForegroundColor Green
        }
    }
    
    Write-Host "📊 Génération terminée: $($driversList.Count) drivers analysés" -ForegroundColor Green
    
    # Mettre à jour app.json
    Update-AppJson -DriversList $driversList
}

# Fonction pour mettre à jour app.json
function Update-AppJson {
    param(
        [array]$DriversList
    )
    
    Write-Host "📝 Mise à jour de app.json..." -ForegroundColor Cyan
    
    if (-not (Test-Path $AppJsonPath)) {
        Write-Host "❌ Fichier app.json non trouvé: $AppJsonPath" -ForegroundColor Red
        return
    }
    
    # Lire le contenu actuel
    $appJsonContent = Get-Content $AppJsonPath -Raw | ConvertFrom-Json
    
    # Mettre à jour la section drivers
    $appJsonContent.drivers = $DriversList
    
    # Sauvegarder le fichier
    $appJsonContent | ConvertTo-Json -Depth 10 | Set-Content $AppJsonPath -Encoding UTF8
    
    Write-Host "✅ app.json mis à jour avec $($DriversList.Count) drivers" -ForegroundColor Green
}

# Fonction pour générer un rapport
function Generate-DriverReport {
    param(
        [array]$DriversList
    )
    
    $reportPath = "RAPPORT-DRIVERS-GENERATION.md"
    
    $report = @"
# 📊 RAPPORT DE GÉNÉRATION DES DRIVERS

## 🎯 **RÉSUMÉ**
- **Drivers analysés** : $($DriversList.Count)
- **Date de génération** : $(Get-Date -Format "yyyy-MM-dd HH:mm:ss")
- **Mode Automatique Intelligent** : Activé

## 📋 **DRIVERS GÉNÉRÉS**

"@
    
    foreach ($driver in $DriversList) {
        $report += @"

### **$($driver.id)**
- **Capabilities** : $($driver.capabilities -join ", ")
- **Images** : $($driver.images.small)
- **Support multilingue** : ✅

"@
    }
    
    $report += @"

## 🚀 **STATISTIQUES**
- **Total drivers** : $($DriversList.Count)
- **Capabilities moyennes** : $(($DriversList | ForEach-Object { $_.capabilities.Count } | Measure-Object -Average).Average)
- **Support multilingue** : 100%

## ✅ **VALIDATION**
- **Génération automatique** : ✅
- **Mise à jour app.json** : ✅
- **Rapport généré** : ✅

---
*Généré automatiquement par le Mode Automatique Intelligent*
"@
    
    $report | Set-Content $reportPath -Encoding UTF8
    Write-Host "📄 Rapport généré: $reportPath" -ForegroundColor Green
}

# Exécution principale
try {
    Write-Host "🚀 DÉMARRAGE DE LA GÉNÉRATION AUTOMATIQUE" -ForegroundColor Green
    Write-Host "Mode Automatique Intelligent activé" -ForegroundColor Yellow
    
    $driversList = @()
    
    # Analyser tous les drivers
    $driverFolders = Get-ChildItem -Path $DriversPath -Directory | Where-Object { 
        $_.Name -notmatch "^(history|backup|temp)" 
    }
    
    foreach ($folder in $driverFolders) {
        $driverInfo = Analyze-Driver -DriverPath $folder.FullName
        $driverEntry = Generate-DriverEntry -DriverInfo $driverInfo
        $driversList += $driverEntry
    }
    
    # Mettre à jour app.json
    Update-AppJson -DriversList $driversList
    
    # Générer le rapport
    Generate-DriverReport -DriversList $driversList
    
    Write-Host "🎉 GÉNÉRATION TERMINÉE AVEC SUCCÈS" -ForegroundColor Green
    Write-Host "📊 $($driversList.Count) drivers générés" -ForegroundColor Cyan
    Write-Host "📝 app.json mis à jour" -ForegroundColor Cyan
    Write-Host "📄 Rapport généré" -ForegroundColor Cyan
    
} catch {
    Write-Host "❌ ERREUR LORS DE LA GÉNÉRATION: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}

Write-Host "🚀 Mode Automatique Intelligent - Génération terminée" -ForegroundColor Green 


