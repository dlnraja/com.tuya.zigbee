#!/usr/bin/env node
'use strict';

/**
 * 🔄 Script converti automatiquement
 * Original: PS1
 * Converti le: 2025-09-03T20:43:36.290Z
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// 🔄 Script converti automatiquement de PS1 vers JavaScript
// ⚠️ Vérification manuelle recommandée

# Script PowerShell pour générer un rapport d'intégration

# Créer le dossier de sortie s'il n'existe pas
$reportDir = Join-Path $PSScriptRoot "reports"
if (-not (fs.existsSync $reportDir)) {
    fs.mkdirSync -ItemType Directory -Path $reportDir | Out-Null
}

# Créer un nom de fichier avec horodatage
$timestamp = new Date() -Format "yyyyMMdd-HHmmss"
$reportPath = Join-Path $reportDir "tuya-integration-report-$timestamp.md"

# Fonction pour obtenir la taille d'un dossier
function Get-DirectorySize {
    param([string]$path)
    
    if (-not (fs.existsSync $path)) { return "0 B" }
    
    $size = (fs.readdirSync -Path $path -Recurse -File | 
             Measure-Object -Property Length -Sum).Sum
    
    if ($size -gt 1GB) { return "{0:N2} GB" -f ($size / 1GB) }
    if ($size -gt 1MB) { return "{0:N2} MB" -f ($size / 1MB) }
    if ($size -gt 1KB) { return "{0:N2} KB" -f ($size / 1KB) }
    return "$size B"
}

# Démarrer le rapport
$report = @"
# Rapport d'Intégration Tuya Zigbee

**Date de génération:** $(new Date() -Format "yyyy-MM-dd HH:mm:ss")

## Structure du Projet

"@

# Analyser la structure du projet
$projectRoot = $PSScriptRoot
$dirs = fs.readdirSync -Path $projectRoot -Directory | 
         // Where-Object equivalent { $_.Name -notin @('node_modules', '.git', 'reports') } |
         // ForEach-Object equivalent {
             $size = Get-DirectorySize -path $_.FullName
             [PSCustomObject]@{
                 Name = $_.Name
                 Size = $size
                 Files = (fs.readdirSync -Path $_.FullName -Recurse -File -ErrorAction SilentlyContinue).Count
             }
         }

# Ajouter la structure au rapport
$report += "`n### Dossiers Principaux`n"
$report += $dirs | Format-Table -Property Name, @{Name="Fichiers";Expression={"$($_.Files)"}}, @{Name="Taille";Expression={"$($_.Size)"}} -AutoSize | Out-String

# Analyser les drivers
$driversPath = Join-Path $projectRoot "drivers"
if (fs.existsSync $driversPath) {
    $drivers = fs.readdirSync -Path $driversPath -Directory
    $driverCount = $drivers.Count
    
    $report += "`n## Analyse des Drivers`n"
    $report += "**Nombre total de drivers:** $driverCount`n"
    
    # Analyser 5 drivers comme échantillon
    $sampleDrivers = $drivers | // Select-Object equivalent -First 5
    
    $report += "`n### Exemple de Drivers`n"
    
    foreach ($driver in $sampleDrivers) {
        $driverName = $driver.Name
        $configPath = Join-Path $driver.FullName "driver.compose.json"
        
        $report += "#### $driverName`n"
        
        if (fs.existsSync $configPath) {
            try {
                $config = fs.readFileSync $configPath -Raw | ConvertFrom-Json
                
                $report += "- **ID:** $($config.id)`n"
                $report += "- **Classe:** $($config.class)`n"
                
                # Vérifier les icônes
                if ($config.images) {
                    $smallIcon = Join-Path $driver.FullName $config.images.small
                    $largeIcon = Join-Path $driver.FullName $config.images.large
                    
                    $report += "- **Icônes:**`n"
                    $report += "  - Petite: $($config.images.small) $(if (fs.existsSync $smallIcon) {'✅'} else {'❌'})`n"
                    $report += "  - Grande: $($config.images.large) $(if (fs.existsSync $largeIcon) {'✅'} else {'❌'})`n"
                } else {
                    $report += "- **Aucune icône configurée**`n"
                }
                
                # Afficher les capacités
                if ($config.capabilities -and $config.capabilities.Count -gt 0) {
                    $report += "- **Capacités:** $($config.capabilities -join ', ')`n"
                }
                
                # Afficher les informations Zigbee
                if ($config.zigbee) {
                    $report += "- **Fabricant:** $($config.zigbee.manufacturerName -join ', ')`n"
                    $report += "- **ID Produit:** $($config.zigbee.productId -join ', ')`n"
                }
                
            } catch {
                $report += "- ❌ Erreur de lecture du fichier de configuration: $_`n"
            }
        } else {
            $report += "- ❌ Fichier de configuration manquant`n"
        }
        
        $report += "`n"
    }
}

# Ajouter un résumé
$report += @"
## Résumé

- **Dossiers principaux:** $($dirs.Count)
- **Drivers détectés:** $driverCount
- **Taille totale du projet:** $(Get-DirectorySize -path $projectRoot)

## Prochaines Étapes Recommandées

1. Vérifier la configuration des drivers manquants
2. S'assurer que toutes les icônes sont présentes et aux bons formats
3. Valider la configuration Zigbee pour chaque appareil
4. Tester les fonctionnalités clés

---
*Rapport généré automatiquement - Tuya Zigbee Integration*
"@

# Enregistrer le rapport
$report | Out-File -FilePath $reportPath -Encoding utf8

# Afficher le chemin du rapport
console.log "Rapport généré avec succès: $reportPath" -ForegroundColor Green

# Afficher un aperçu du rapport
console.log "`n=== APERÇU DU RAPPORT ===`n" -ForegroundColor Cyan
fs.readFileSync -Path $reportPath -TotalCount 20 | // ForEach-Object equivalent { console.log $_ }
