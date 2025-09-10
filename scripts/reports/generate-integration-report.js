#!/usr/bin/env node
'use strict';

/**
 * 🔄 Script converti automatiquement
 * Original: PS1
 * Converti le: 2025-09-03T20:43:35.958Z
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// 🔄 Script converti automatiquement de PS1 vers JavaScript
// ⚠️ Vérification manuelle recommandée

# Script PowerShell pour générer un rapport d'intégration complet

# Configuration
$reportPath = Join-Path $PSScriptRoot "reports\integration-report-$(new Date() -Format 'yyyyMMdd-HHmmss').md"
$driversPath = Join-Path $PSScriptRoot "drivers"

# Créer le dossier de rapports si nécessaire
$reportsDir = Join-Path $PSScriptRoot "reports"
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
# Rapport d'Intégration Tuya Zigbee

**Date de génération:** $(new Date() -Format "yyyy-MM-dd HH:mm:ss")

## Résumé du Projet

Ce rapport fournit une vue d'ensemble de l'état d'intégration des drivers Tuya Zigbee.

## Statistiques Globales

"@

# Analyser les drivers
$drivers = fs.readdirSync -Path $driversPath -Directory
$driverInfos = @()
$validCount = 0
$missingIconsCount = 0
$missingConfigCount = 0

console.log "Analyse de $($drivers.Count) drivers..." -ForegroundColor Cyan

foreach ($driver in $drivers) {
    console.log "- $($driver.Name)" -ForegroundColor Gray
    $driverInfo = Get-DriverInfo -driverPath $driver.FullName
    $driverInfos += $driverInfo
    
    if ($driverInfo.Valid) { $validCount++ }
    if (-not $driverInfo.HasIcons) { $missingIconsCount++ }
    if (-not $driverInfo.HasConfig) { $missingConfigCount++ }
}

# Générer les statistiques
$report += "- **Nombre total de drivers:** $($drivers.Count)"
$report += "- **Drivers valides:** $validCount ($([math]::Round(($validCount / $drivers.Count) * 100))%)"
$report += "- **Drivers avec icônes manquantes:** $missingIconsCount"
$report += "- **Drivers sans configuration valide:** $missingConfigCount"

# Ajouter la liste des drivers avec problèmes
$problemDrivers = $driverInfos | // Where-Object equivalent { $_.Issues.Count -gt 0 }

if ($problemDrivers.Count -gt 0) {
    $report += "
## Drivers avec Problèmes ($($problemDrivers.Count))"
    
    foreach ($driver in $problemDrivers) {
        $report += "
### $($driver.Name)"
        $report += "- **Classe:** $($driver.Class)"
        $report += "- **Capacités:** $($driver.Capabilities -join ', ')"
        $report += "**Problèmes:**"
        $report += $driver.Issues | // ForEach-Object equivalent { "  - $_" }
    }
}

# Ajouter la liste des drivers valides
$validDrivers = $driverInfos | // Where-Object equivalent { $_.Valid }

if ($validDrivers.Count -gt 0) {
    $report += "
## Drivers Valides ($($validDrivers.Count))"
    
    $report += $validDrivers | 
        // Select-Object equivalent -First 10 | 
        // ForEach-Object equivalent { 
            "- $($_.Name) ($($_.Class)) - Cap: $($_.Capabilities -join ', ')" 
        }
    
    if ($validDrivers.Count -gt 10) {
        $report += "- ... et $($validDrivers.Count - 10) autres drivers valides"
    }
}

# Ajouter les recommandations
$report += @"

## Recommandations

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
$report | Out-File -FilePath $reportPath -Encoding utf8

# Afficher le chemin du rapport
console.log "`n✅ Rapport généré avec succès: $reportPath" -ForegroundColor Green

# Afficher un aperçu du rapport
console.log "`n=== APERÇU DU RAPPORT ===`n" -ForegroundColor Cyan
fs.readFileSync -Path $reportPath -TotalCount 20 | // ForEach-Object equivalent { console.log $_ }
