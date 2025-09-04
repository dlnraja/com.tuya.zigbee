#!/usr/bin/env node
'use strict';

/**
 * 🔄 Script converti automatiquement
 * Original: PS1
 * Converti le: 2025-09-03T20:43:39.556Z
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// 🔄 Script converti automatiquement de PS1 vers JavaScript
// ⚠️ Vérification manuelle recommandée

# Script PowerShell pour générer un rapport d'intégration Tuya Zigbee

# Configuration
$reportPath = Join-Path -Path $PSScriptRoot -ChildPath "reports\tuya-report-$(new Date() -Format 'yyyyMMdd-HHmmss').md"
$driversPath = Join-Path -Path $PSScriptRoot -ChildPath "drivers"

# Créer le dossier des rapports si nécessaire
$reportsDir = Split-Path -Path $reportPath -Parent
if (-not (fs.existsSync -Path $reportsDir)) {
    fs.mkdirSync -ItemType Directory -Path $reportsDir | Out-Null
}

# Vérifier si le dossier des drivers existe
if (-not (fs.existsSync -Path $driversPath)) {
    "# Erreur: Le dossier des drivers n'existe pas" | Out-File -FilePath $reportPath -Encoding utf8
    "Le dossier spécifié n'existe pas: $driversPath" | Out-File -FilePath $reportPath -Append -Encoding utf8
    exit 1
}

# Initialiser le rapport
$report = @"
# Rapport d'Intégration Tuya Zigbee

**Date de génération:** $(new Date() -Format 'yyyy-MM-dd HH:mm:ss')  
**Dossier analysé:** $driversPath

## 📊 Résumé

"@

# Analyser les dossiers de drivers
$driverDirs = fs.readdirSync -Path $driversPath -Directory
$totalDrivers = $driverDirs.Count
$validDrivers = 0
$invalidDrivers = 0
$driversWithIcons = 0

$report += "- **Nombre total de drivers:** $totalDrivers`n"

# Détails des drivers
$report += "`n## 📋 Détails des Drivers`n`n"
$report += "| Nom du Driver | Statut | Fichier Config | Icônes | Problèmes |`n"
$report += "|--------------|--------|----------------|--------|-----------|`n"

foreach ($dir in $driverDirs) {
    $driverName = $dir.Name
    $hasConfig = $false
    $hasIcons = $false
    $issues = @()
    
    # Vérifier le fichier de configuration
    $configFile = Join-Path -Path $dir.FullName -ChildPath "driver.compose.json"
    if (fs.existsSync -Path $configFile) {
        $hasConfig = $true
        
        # Vérifier les icônes
        $iconFiles = fs.readdirSync -Path $dir.FullName -Filter "*.png"
        if ($iconFiles.Count -gt 0) {
            $hasIcons = $true
            $driversWithIcons++
        } else {
            $issues += "Aucune icône PNG trouvée"
        }
        
        # Vérifier le contenu du fichier de configuration
        try {
            $config = fs.readFileSync -Path $configFile -Raw | ConvertFrom-Json
            
            # Vérifier les champs obligatoires
            $requiredFields = @('id', 'class', 'name')
            foreach ($field in $requiredFields) {
                if (-not $config.PSObject.Properties.Name.Contains($field)) {
                    $issues += "Champ obligatoire manquant: $field"
                }
            }
            
            # Vérifier les images
            if (-not $config.images) {
                $issues += "Section 'images' manquante dans la configuration"
            }
            
        } catch {
            $issues += "Erreur de lecture du fichier de configuration: $_"
        }
        
    } else {
        $issues += "Fichier de configuration manquant"
    }
    
    # Mettre à jour les compteurs
    if ($hasConfig -and $issues.Count -eq 0) {
        $validDrivers++
        $status = "✅ Valide"
    } else {
        $invalidDrivers++
        $status = "❌ Problèmes ($($issues.Count))"
    }
    
    # Ajouter une ligne au rapport
    $iconStatus = if ($hasIcons) { "✅" } else { "❌" }
    $configStatus = if ($hasConfig) { "✅" } else { "❌" }
    $issuesText = if ($issues.Count -gt 0) { ($issues -join "; ") } else { "Aucun" }
    
    $report += "| $driverName | $status | $configStatus | $iconStatus | $issuesText |`n"
}

# Générer le résumé
$report += "`n## 📊 Statistiques`n`n"
$report += "- **Drivers valides:** $validDrivers/$totalDrivers ($([math]::Round(($validDrivers / $totalDrivers) * 100, 2))%)`n"
$report += "- **Drivers avec problèmes:** $invalidDrivers`n"
$report += "- **Drivers avec icônes:** $driversWithIcons/$totalDrivers`n"

# Ajouter des recommandations
$report += @"

## 🚀 Recommandations

1. **Corriger les problèmes critiques**
   - $invalidDrivers drivers nécessitent une attention immédiate
   - Mettre à jour les configurations manquantes ou invalides

2. **Gestion des icônes**
   - $($totalDrivers - $driversWithIcons) drivers n'ont pas d'icônes
   - Standardiser le format des icônes (PNG recommandé)

3. **Validation des drivers**
   - Implémenter des tests automatisés
   - Vérifier la compatibilité avec les appareils cibles

4. **Documentation**
   - Mettre à jour la documentation pour refléter les changements
   - Documenter les exigences pour les nouveaux drivers

---
*Rapport généré automatiquement - Tuya Zigbee Integration*
"@

# Enregistrer le rapport
$report | Out-File -FilePath $reportPath -Encoding utf8

# Afficher un résumé dans la console
console.log "`n✅ Rapport généré avec succès: $reportPath" -ForegroundColor Green
console.log "- Nombre total de drivers: $totalDrivers"
console.log "- Drivers valides: $validDrivers"
console.log "- Drivers avec problèmes: $invalidDrivers"
console.log "- Drivers avec icônes: $driversWithIcons"

# Ouvrir le rapport dans l'éditeur par défaut
Start-Process $reportPath
