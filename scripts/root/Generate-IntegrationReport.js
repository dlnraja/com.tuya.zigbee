#!/usr/bin/env node
'use strict';

/**
 * 🔄 Script converti automatiquement
 * Original: PS1
 * Converti le: 2025-09-03T20:43:39.528Z
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// 🔄 Script converti automatiquement de PS1 vers JavaScript
// ⚠️ Vérification manuelle recommandée

# Script PowerShell pour générer un rapport d'intégration complet

# Configuration
$rootDir = $PSScriptRoot
$reportsDir = Join-Path $rootDir "reports"
$driversDir = Join-Path $rootDir "drivers"
$timestamp = new Date() -Format "yyyyMMdd-HHmmss"
$reportFile = Join-Path $reportsDir "integration-report-$timestamp.md"

# Créer le dossier des rapports s'il n'existe pas
if (-not (fs.existsSync $reportsDir)) {
    fs.mkdirSync -ItemType Directory -Path $reportsDir | Out-Null
}

# Fonction pour obtenir des informations sur un driver
function Get-DriverInfo {
    param (
        [string]$driverPath
    )
    
    $driverName = Split-Path $driverPath -Leaf
    $configPath = Join-Path $driverPath "driver.compose.json"
    
    $driverInfo = [PSCustomObject]@{
        Name = $driverName
        Valid = $false
        HasConfig = $false
        HasIcons = $false
        Issues = @()
        Class = ""
        Capabilities = @()
        Manufacturer = ""
        ProductId = ""
        Clusters = @()
    }
    
    # Vérifier le fichier de configuration
    if (fs.existsSync $configPath) {
        try {
            $config = fs.readFileSync $configPath -Raw | ConvertFrom-Json
            $driverInfo.HasConfig = $true
            
            # Extraire les informations de base
            $driverInfo.Class = $config.class
            if ($config.capabilities) {
                $driverInfo.Capabilities = $config.capabilities
            }
            
            # Extraire les informations Zigbee
            if ($config.zigbee) {
                $driverInfo.Manufacturer = if ($config.zigbee.manufacturerName) { $config.zigbee.manufacturerName[0] } else { "" }
                $driverInfo.ProductId = if ($config.zigbee.productId) { $config.zigbee.productId[0] } else { "" }
                
                if ($config.zigbee.endpoints) {
                    $driverInfo.Clusters = $config.zigbee.endpoints.PSObject.Properties.Value.clusters | 
                        // Select-Object equivalent -Unique | 
                        // ForEach-Object equivalent { if ($_ -is [array]) { $_ } else { @($_) } } | 
                        // Select-Object equivalent -Unique
                }
            }
            
            # Vérifier les icônes
            if ($config.images) {
                $smallIcon = Join-Path $driverPath $config.images.small
                $largeIcon = Join-Path $driverPath $config.images.large
                
                $hasSmallIcon = fs.existsSync $smallIcon
                $hasLargeIcon = fs.existsSync $largeIcon
                
                if ($hasSmallIcon -and $hasLargeIcon) {
                    $driverInfo.HasIcons = $true
                } else {
                    if (-not $hasSmallIcon) { $driverInfo.Issues += "Icône manquante: $($config.images.small)" }
                    if (-not $hasLargeIcon) { $driverInfo.Issues += "Icône manquante: $($config.images.large)" }
                }
            } else {
                $driverInfo.Issues += "Section 'images' manquante dans la configuration"
            }
            
            # Vérifier les champs obligatoires
            $requiredFields = @('id', 'class', 'name')
            foreach ($field in $requiredFields) {
                if (-not $config.PSObject.Properties.Name.Contains($field)) {
                    $driverInfo.Issues += "Champ obligatoire manquant: $field"
                }
            }
            
            $driverInfo.Valid = $driverInfo.Issues.Count -eq 0
            
        } catch {
            $driverInfo.Issues += "Erreur de lecture du fichier de configuration: $_"
        }
    } else {
        $driverInfo.Issues += "Fichier de configuration manquant"
    }
    
    return $driverInfo
}

# Démarrer le rapport
$report = @"
# 📊 Rapport d'Intégration Tuya Zigbee

**Date de génération:** $(new Date() -Format "yyyy-MM-dd HH:mm:ss")  
**Dépôt:** [dlnraja/com.tuya.zigbee](https://github.com/dlnraja/com.tuya.zigbee)

## 📋 Résumé du Projet

Ce rapport fournit une vue d'ensemble de l'état d'intégration des drivers Tuya Zigbee.

"@

# Analyser les drivers
$driverDirs = fs.readdirSync -Path $driversDir -Directory
$driverInfos = @()
$validCount = 0
$missingIconsCount = 0
$missingConfigCount = 0

console.log "Analyse de $($driverDirs.Count) drivers..." -ForegroundColor Cyan

foreach ($dir in $driverDirs) {
    console.log "- $($dir.Name)" -ForegroundColor Gray
    $driverInfo = Get-DriverInfo -driverPath $dir.FullName
    $driverInfos += $driverInfo
    
    if ($driverInfo.Valid) { $validCount++ }
    if (-not $driverInfo.HasIcons) { $missingIconsCount++ }
    if (-not $driverInfo.HasConfig) { $missingConfigCount++ }
}

# Générer les statistiques
$report += "## 📊 Statistiques Globales
"
$report += "- **Nombre total de drivers:** $($driverDirs.Count)"
$report += "- **Drivers valides:** $validCount ($([math]::Round(($validCount / $driverDirs.Count) * 100))%)"
$report += "- **Drivers avec icônes manquantes:** $missingIconsCount"
$report += "- **Drivers sans configuration valide:** $missingConfigCount"

# Ajouter la matrice des appareils
$report += "
## 📋 Matrice des Appareils
"
$report += "| Nom | Fabricant | ID Produit | Classe | Clusters | Capabilités | Statut |"
$report += "|-----|-----------|------------|--------|----------|-------------|---------|"

foreach ($driver in $driverInfos | Sort-Object Name) {
    $status = if ($driver.Valid) { "✅ Valide" } else { "❌ Problèmes ($($driver.Issues.Count))" }
    $clusters = $driver.Clusters -join ", "
    if ([string]::IsNullOrEmpty($clusters)) { $clusters = "-" }
    
    $capabilities = $driver.Capabilities -join ", "
    if ([string]::IsNullOrEmpty($capabilities)) { $capabilities = "-" }
    
    $report += "| $($driver.Name) | $($driver.Manufacturer) | $($driver.ProductId) | $($driver.Class) | $clusters | $capabilities | $status |"
}

# Ajouter la section des problèmes
$problemDrivers = $driverInfos | // Where-Object equivalent { $_.Issues.Count -gt 0 }

if ($problemDrivers.Count -gt 0) {
    $report += "
## ⚠️ Problèmes Identifiés ($($problemDrivers.Count) drivers)"
    
    foreach ($driver in $problemDrivers | Sort-Object Name) {
        $report += "
### $($driver.Name)"
        $report += "- **Classe:** $($driver.Class)"
        $report += "- **Fabricant:** $($driver.Manufacturer)"
        $report += "- **ID Produit:** $($driver.ProductId)"
        $report += "**Problèmes:**"
        $report += $driver.Issues | // ForEach-Object equivalent { "  - $_" }
    }
}

# Ajouter les recommandations
$report += @"

## 🚀 Recommandations

1. **Corriger les problèmes critiques**
   - $($problemDrivers.Count) drivers nécessitent une attention immédiate
   - Mettre à jour les configurations manquantes ou invalides

2. **Gestion des icônes**
   - $missingIconsCount drivers ont des icônes manquantes
   - Standardiser le format des icônes (PNG recommandé)
   - S'assurer que les chemins dans la configuration sont corrects

3. **Validation des drivers**
   - Implémenter des tests automatisés
   - Vérifier la compatibilité avec les appareils cibles

4. **Documentation**
   - Mettre à jour la documentation pour refléter les changements
   - Documenter les exigences pour les nouveaux drivers

## Prochaines Étapes

1. Examiner les drivers avec problèmes et apporter les corrections nécessaires
2. Valider les fonctionnalités des drivers modifiés
3. Mettre à jour la documentation utilisateur
4. Tester l'intégration avec des appareils physiques

---
*Rapport généré automatiquement - Tuya Zigbee Integration*
"@

# Enregistrer le rapport
$report | Out-File -FilePath $reportFile -Encoding utf8

# Afficher le chemin du rapport
console.log "`n✅ Rapport généré avec succès: $reportFile" -ForegroundColor Green

# Ouvrir le rapport dans l'éditeur par défaut
Start-Process $reportFile
