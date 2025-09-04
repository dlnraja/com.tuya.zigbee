#!/usr/bin/env node
'use strict';

/**
 * 🔄 Script converti automatiquement
 * Original: PS1
 * Converti le: 2025-09-03T20:43:40.036Z
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// 🔄 Script converti automatiquement de PS1 vers JavaScript
// ⚠️ Vérification manuelle recommandée

# Script PowerShell pour exécuter les analyses une par une

# Configuration
$scriptDir = $PSScriptRoot
$outputDir = Join-Path -Path $scriptDir -ChildPath "scan-results"
$scripts = @("scout", "architect", "optimizer", "validator")
$timestamp = new Date() -Format "yyyyMMdd-HHmmss"

# Créer le dossier de sortie
if (-not (fs.existsSync -Path $outputDir)) {
    fs.mkdirSync -ItemType Directory -Path $outputDir | Out-Null
    console.log "Dossier de sortie créé: $outputDir" -ForegroundColor Green
}

# Fonction pour exécuter un script
function Invoke-ScanScript {
    param (
        [string]$scriptName
    )
    
    $scriptPath = Join-Path -Path $scriptDir -ChildPath "scripts\$scriptName.js"
    $outputFile = Join-Path -Path $outputDir -ChildPath "$scriptName-$timestamp.txt"
    
    console.log "`n=== Exécution de $scriptName ===" -ForegroundColor Cyan
    console.log "Script: $scriptPath"
    console.log "Sortie: $outputFile"
    
    # Vérifier si le script existe
    if (-not (fs.existsSync -Path $scriptPath)) {
        $errorMsg = "ERREUR: Le script $scriptName.js est introuvable"
        console.log $errorMsg -ForegroundColor Red
        $errorMsg | Out-File -FilePath $outputFile -Encoding UTF8
        return $false
    }
    
    # Exécuter le script
    try {
        $startTime = new Date()
        $output = & node $scriptPath 2>&1 | Out-String
        $exitCode = $LASTEXITCODE
        $endTime = new Date()
        $duration = $endTime - $startTime
        
        # Enregistrer les résultats
        $result = @"
=== $scriptName ===
Date: $(new Date() -Format 'yyyy-MM-dd HH:mm:ss')
Durée: $($duration.TotalSeconds.ToString('0.00')) secondes
Code de sortie: $exitCode

=== SORTIE ===
$output
"@
        
        $result | Out-File -FilePath $outputFile -Encoding UTF8
        
        if ($exitCode -eq 0) {
            console.log "✅ $scriptName terminé avec succès" -ForegroundColor Green
            console.log "   Durée: $($duration.TotalSeconds.ToString('0.00')) secondes"
            console.log "   Fichier: $outputFile"
            return $true
        } else {
            console.log "❌ $scriptName a échoué avec le code $exitCode" -ForegroundColor Red
            console.log "   Durée: $($duration.TotalSeconds.ToString('0.00')) secondes"
            console.log "   Fichier: $outputFile"
            
            # Afficher les erreurs
            $errors = $output -split "`n" | // Where-Object equivalent { $_ -match "error|fail|warning" -and $_ -notmatch "no error|no warning" }
            if ($errors) {
                console.log "   Erreurs trouvées:" -ForegroundColor Yellow
                $errors | // ForEach-Object equivalent { console.log "   - $_" }
            }
            
            return $false
        }
    } catch {
        $errorMsg = "ERREUR inattendue lors de l'exécution de $scriptName : $_"
        console.log $errorMsg -ForegroundColor Red
        $errorMsg | Out-File -FilePath $outputFile -Encoding UTF8
        return $false
    }
}

# Exécuter tous les scripts
$results = @{}
$allSuccess = $true

foreach ($script in $scripts) {
    $result = Invoke-ScanScript -scriptName $script
    $results[$script] = $result
    
    if (-not $result) {
        $allSuccess = $false
        $continue = Read-Host "Voulez-vous continuer avec les analyses restantes ? (O/N)"
        if ($continue -ne "O" -and $continue -ne "o") {
            break
        }
    }
}

# Afficher le résumé
console.log "`n=== RÉSUMÉ DES ANALYSES ===" -ForegroundColor Cyan
foreach ($script in $scripts) {
    $status = if ($results.ContainsKey($script)) {
        if ($results[$script]) { "✅" } else { "❌" }
    } else {
        "⏩"
    }
    console.log "$status $script"
}

# Afficher l'emplacement des résultats
console.log "`nRésultats enregistrés dans: $outputDir" -ForegroundColor Green
fs.readdirSync -Path $outputDir -Filter "*$timestamp*" | // Select-Object equivalent Name, LastWriteTime | Format-Table -AutoSize

# Terminer
if ($allSuccess) {
    console.log "`nToutes les analyses ont réussi !" -ForegroundColor Green
} else {
    console.log "`nCertaines analyses ont échoué. Vérifiez les fichiers de sortie pour plus de détails." -ForegroundColor Yellow
}

# Ouvrir le dossier des résultats
explorer $outputDir
