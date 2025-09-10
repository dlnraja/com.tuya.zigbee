#!/usr/bin/env node
'use strict';

/**
 * 🔄 Script converti automatiquement
 * Original: PS1
 * Converti le: 2025-09-03T20:43:36.543Z
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// 🔄 Script converti automatiquement de PS1 vers JavaScript
// ⚠️ Vérification manuelle recommandée

# Script simple pour générer un rapport d'intégration Tuya Zigbee

# Configuration
$reportPath = "reports\simple-tuya-report-$(new Date() -Format 'yyyyMMdd-HHmmss').txt"
$driversPath = "drivers"

# Créer le dossier des rapports si nécessaire
if (-not (fs.existsSync -Path "reports")) {
    fs.mkdirSync -ItemType Directory -Path "reports" | Out-Null
}

# Fonction pour écrire dans le rapport
function Write-Report {
    param([string]$Message)
    fs.appendFileSync -Path $reportPath -Value $Message
}

# Initialiser le rapport
"=== RAPPORT D'INTEGRATION TUYA ZIGBEE ===" | Out-File -FilePath $reportPath -Encoding utf8
"Date: $(new Date() -Format 'yyyy-MM-dd HH:mm:ss')" | Out-File -FilePath $reportPath -Append -Encoding utf8
"Dossier analysé: $(Resolve-Path $driversPath)
" | Out-File -FilePath $reportPath -Append -Encoding utf8

# Vérifier si le dossier des drivers existe
if (-not (fs.existsSync -Path $driversPath)) {
    "ERREUR: Le dossier des drivers n'existe pas: $driversPath" | Out-File -FilePath $reportPath -Append -Encoding utf8
    exit 1
}

# Initialiser les compteurs
$totalDrivers = 0
$validDrivers = 0
$driversWithIcons = 0

# Obtenir la liste des dossiers de drivers
$driverDirs = fs.readdirSync -Path $driversPath -Directory
$totalDrivers = $driverDirs.Count

"=== ANALYSE DES DRIVERS ===" | Out-File -FilePath $reportPath -Append -Encoding utf8
"Nombre total de drivers trouvés: $totalDrivers
" | Out-File -FilePath $reportPath -Append -Encoding utf8

# Analyser chaque dossier de driver
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
        
        # Compter comme valide s'il a un fichier de configuration
        $validDrivers++
        
        # Écrire les détails du driver
        "[CONFIG] $driverName : OK" | Out-File -FilePath $reportPath -Append -Encoding utf8
        if ($hasIcons) {
            "[ICONES] $driverName : OK ($($iconFiles.Count) icônes trouvées)" | Out-File -FilePath $reportPath -Append -Encoding utf8
        } else {
            "[ICONES] $driverName : AUCUNE ICONE" | Out-File -FilePath $reportPath -Append -Encoding utf8
        }
    } else {
        "[ERREUR] $driverName : Fichier de configuration manquant" | Out-File -FilePath $reportPath -Append -Encoding utf8
    }
    
    # Ajouter un saut de ligne
    "" | Out-File -FilePath $reportPath -Append -Encoding utf8
}

# Calculer les statistiques
$percentValid = 0
if ($totalDrivers -gt 0) {
    $percentValid = [math]::Round(($validDrivers / $totalDrivers) * 100, 2)
}

# Ajouter le résumé au rapport
"`n=== RESUME ===" | Out-File -FilePath $reportPath -Append -Encoding utf8
"Nombre total de drivers: $totalDrivers" | Out-File -FilePath $reportPath -Append -Encoding utf8
"Drivers valides: $validDrivers ($percentValid%)" | Out-File -FilePath $reportPath -Append -Encoding utf8
"Drivers avec icônes: $driversWithIcons/$totalDrivers" | Out-File -FilePath $reportPath -Append -Encoding utf8

# Ajouter des recommandations
"`n=== RECOMMANDATIONS ===" | Out-File -FilePath $reportPath -Append -Encoding utf8
if ($validDrivers -lt $totalDrivers) {
    "1. Corriger les $($totalDrivers - $validDrivers) drivers avec des erreurs de configuration" | Out-File -FilePath $reportPath -Append -Encoding utf8
}
if ($driversWithIcons -lt $totalDrivers) {
    $missingIcons = $totalDrivers - $driversWithIcons
    "2. Ajouter des icônes aux $missingIcons drivers qui n'en ont pas" | Out-File -FilePath $reportPath -Append -Encoding utf8
}
"3. Vérifier les traductions pour chaque driver" | Out-File -FilePath $reportPath -Append -Encoding utf8
"4. Tester les fonctionnalités de chaque driver" | Out-File -FilePath $reportPath -Append -Encoding utf8

# Afficher le chemin du rapport
$fullReportPath = Resolve-Path $reportPath
console.log "`nRapport généré avec succès: $fullReportPath" -ForegroundColor Green

# Ouvrir le rapport
Start-Process $reportPath
