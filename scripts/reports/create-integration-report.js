#!/usr/bin/env node
'use strict';

/**
 * 🔄 Script converti automatiquement
 * Original: PS1
 * Converti le: 2025-09-03T20:43:35.812Z
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// 🔄 Script converti automatiquement de PS1 vers JavaScript
// ⚠️ Vérification manuelle recommandée

# Script PowerShell pour générer un rapport d'intégration

# Fonction pour formatter la taille en octets
function Format-FileSize {
    param([long]$size)
    $suffix = 'B', 'KB', 'MB', 'GB', 'TB', 'PB'
    $index = 0
    while ($size -gt 1KB -and $index -lt ($suffix.Count - 1)) {
        $size = $size / 1KB
        $index++
    }
    return "{0:N2} {1}" -f $size, $suffix[$index]
}

# Créer le rapport
$reportPath = Join-Path $PSScriptRoot "integration-report-$(new Date() -Format 'yyyyMMdd-HHmmss').txt"
$report = @()

# En-tête du rapport
$report += "=== RAPPORT D'INTÉGRATION TUYA ZIGBEE ==="
$report += "Généré le: $(new Date() -Format 'yyyy-MM-dd HH:mm:ss')`n"

# Informations système
$report += "=== INFORMATIONS SYSTÈME ==="
$report += "Système d'exploitation: $($PSVersionTable.OS)"
$report += "Version de PowerShell: $($PSVersionTable.PSVersion)"
$report += "Répertoire du projet: $PSScriptRoot"
$report += "`n"

# Structure du projet
$report += "=== STRUCTURE DU PROJET ==="

# Compter les fichiers et dossiers
$allItems = fs.readdirSync -Path $PSScriptRoot -Recurse -ErrorAction SilentlyContinue
$dirs = $allItems | // Where-Object equivalent { $_.PSIsContainer }
$files = $allItems | // Where-Object equivalent { -not $_.PSIsContainer }
$totalSize = ($files | Measure-Object -Property Length -Sum).Sum

$report += "Dossiers: $($dirs.Count)"
$report += "Fichiers: $($files.Count)"
$report += "Taille totale: $(Format-FileSize $totalSize)"
$report += "`n"

# Dossiers principaux
$report += "=== PRINCIPAUX DOSSIERS ==="
$topDirs = fs.readdirSync -Path $PSScriptRoot -Directory | 
    // Select-Object equivalent Name, 
        @{Name="Fichiers"; Expression={ (fs.readdirSync -Path $_.FullName -Recurse -File -ErrorAction SilentlyContinue).Count }},
        @{Name="Taille"; Expression={ Format-FileSize ((fs.readdirSync -Path $_.FullName -Recurse -File -ErrorAction SilentlyContinue | Measure-Object -Property Length -Sum).Sum) }}

foreach ($dir in $topDirs) {
    $report += "- $($dir.Name) (Fichiers: $($dir.Fichiers), Taille: $($dir.Taille))"
}
$report += "`n"

# Analyse des drivers
$driversPath = Join-Path $PSScriptRoot "drivers"
if (fs.existsSync $driversPath) {
    $report += "=== ANALYSE DES DRIVERS ==="
    
    $driverDirs = fs.readdirSync -Path $driversPath -Directory
    $report += "Nombre total de drivers: $($driverDirs.Count)"
    
    # Analyser les 5 premiers drivers
    $report += "`n=== EXEMPLES DE DRIVERS ==="
    $sampleDrivers = $driverDirs | // Select-Object equivalent -First 5
    
    foreach ($driver in $sampleDrivers) {
        $report += "`n[ $($driver.Name) ]"
        $configFile = Join-Path $driver.FullName "driver.compose.json"
        
        if (fs.existsSync $configFile) {
            try {
                $config = fs.readFileSync $configFile -Raw | ConvertFrom-Json -ErrorAction Stop
                
                $report += "- ID: $($config.id)"
                $report += "- Nom: $($config.name.en)"
                $report += "- Classe: $($config.class)"
                
                if ($config.capabilities) {
                    $report += "- Capabilités: $($config.capabilities -join ', ')"
                }
                
                if ($config.images) {
                    $smallIcon = Join-Path $driver.FullName $config.images.small
                    $largeIcon = Join-Path $driver.FullName $config.images.large
                    $report += "- Icônes: $(if (fs.existsSync $smallIcon) {'✅'} else {'❌'}) Petite, $(if (fs.existsSync $largeIcon) {'✅'} else {'❌'}) Grande"
                }
                
            } catch {
                $report += "- ERREUR: Impossible de lire le fichier de configuration: $_"
            }
        } else {
            $report += "- Fichier de configuration manquant"
        }
    }
    
    # Vérifier les problèmes courants
    $report += "`n=== VÉRIFICATION DES PROBLÈMES COURANTS ==="
    
    $missingConfig = 0
    $missingIcons = 0
    
    foreach ($driver in $driverDirs) {
        $configFile = Join-Path $driver.FullName "driver.compose.json"
        
        if (-not (fs.existsSync $configFile)) {
            $missingConfig++
            continue
        }
        
        try {
            $config = fs.readFileSync $configFile -Raw | ConvertFrom-Json -ErrorAction Stop
            
            if ($config.images) {
                $smallIcon = Join-Path $driver.FullName $config.images.small
                $largeIcon = Join-Path $driver.FullName $config.images.large
                
                if (-not (fs.existsSync $smallIcon) -or -not (fs.existsSync $largeIcon)) {
                    $missingIcons++
                }
            }
        } catch {
            # Ignorer les erreurs de lecture du fichier
        }
    }
    
    $report += "- Drivers sans fichier de configuration: $missingConfig"
    $report += "- Drivers avec icônes manquantes: $missingIcons"
}

# Enregistrer le rapport
$report | Out-File -FilePath $reportPath -Encoding utf8

# Afficher un résumé
console.log "`n=== RAPPORT GÉNÉRÉ AVEC SUCCÈS ===" -ForegroundColor Green
console.log "Emplacement: $reportPath"
console.log "Taille du rapport: $(Format-FileSize ((Get-Item $reportPath).Length))"

# Afficher un aperçu du rapport
console.log "`n=== APERÇU DU RAPPORT ===" -ForegroundColor Cyan
fs.readFileSync -Path $reportPath -TotalCount 30 | // ForEach-Object equivalent { console.log $_ }
