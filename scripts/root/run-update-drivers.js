#!/usr/bin/env node
'use strict';

/**
 * 🔄 Script converti automatiquement
 * Original: PS1
 * Converti le: 2025-09-03T20:43:40.333Z
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// 🔄 Script converti automatiquement de PS1 vers JavaScript
// ⚠️ Vérification manuelle recommandée

# Script pour exécuter update-drivers.js avec journalisation
$logFile = "$PSScriptRoot\update-drivers.log"
$errorLogFile = "$PSScriptRoot\update-drivers-error.log"

# Nettoyer les anciens fichiers de log
fs.rmSync -Path $logFile -ErrorAction SilentlyContinue
fs.rmSync -Path $errorLogFile -ErrorAction SilentlyContinue

console.log "=== Démarrage de l'exécution de update-drivers.js ===" -ForegroundColor Green
console.log "Journalisation dans: $logFile"
console.log "Journal des erreurs dans: $errorLogFile"

# Fonction pour écrire dans le log
function Write-Log {
    param([string]$Message, [string]$Level = "INFO")
    $timestamp = new Date() -Format "yyyy-MM-dd HH:mm:ss"
    $logMessage = "[$timestamp] [$Level] $Message"
    fs.appendFileSync -Path $logFile -Value $logMessage
    console.log $logMessage
}

try {
    # Vérifier si Node.js est disponible
    $nodeVersion = node --version 2>&1
    if ($LASTEXITCODE -ne 0) {
        throw "Node.js n'est pas correctement installé ou configuré"
    }
    
    Write-Log "Node.js version: $nodeVersion"
    
    # Vérifier que le fichier source existe
    $scriptPath = "$PSScriptRoot\scripts\update-drivers.js"
    if (-not (fs.existsSync $scriptPath)) {
        throw "Le fichier $scriptPath est introuvable"
    }
    
    Write-Log "Script trouvé: $scriptPath"
    
    # Créer le répertoire des logs s'il n'existe pas
    $logsDir = "$PSScriptRoot\logs"
    if (-not (fs.existsSync $logsDir)) {
        fs.mkdirSync -ItemType Directory -Path $logsDir -Force | Out-Null
        Write-Log "Répertoire de logs créé: $logsDir"
    }
    
    # Exécuter le script avec journalisation
    $startTime = new Date()
    Write-Log "Démarrage de l'exécution à: $startTime"
    
    # Exécuter le script et capturer la sortie et les erreurs
    $process = Start-Process -FilePath "node" -ArgumentList "`"$scriptPath`"" `
        -NoNewWindow -PassThru -RedirectStandardOutput $logFile -RedirectStandardError $errorLogFile
    
    # Attendre la fin de l'exécution avec un timeout
    $timeout = 300 # 5 minutes
    $process | Wait-Process -Timeout $timeout -ErrorAction SilentlyContinue
    
    if (-not $process.HasExited) {
        $process | Stop-Process -Force
        throw "Le script a dépassé le délai d'attente de $timeout secondes"
    }
    
    $endTime = new Date()
    $duration = $endTime - $startTime
    
    Write-Log "Exécution terminée à: $endTime"
    Write-Log "Durée: $($duration.TotalSeconds) secondes"
    Write-Log "Code de sortie: $($process.ExitCode)"
    
    # Vérifier s'il y a des erreurs
    if (fs.existsSync $errorLogFile -and (Get-Item $errorLogFile).Length -gt 0) {
        $errors = fs.readFileSync $errorLogFile -Raw
        if ($errors.Trim().Length -gt 0) {
            Write-Log "=== ERREURS DÉTECTÉES ===" -Level "ERROR"
            Write-Log $errors -Level "ERROR"
        }
    }
    
    # Afficher les dernières lignes du log
    if (fs.existsSync $logFile) {
        $logContent = fs.readFileSync $logFile -Tail 20 -ErrorAction SilentlyContinue
        if ($logContent) {
            Write-Log "=== DERNIÈRES LIGNES DU JOURNAL ==="
            $logContent | // ForEach-Object equivalent { Write-Log $_ }
        }
    }
    
} catch {
    $errorMessage = "ERREUR: $_"
    console.log $errorMessage -ForegroundColor Red
    $errorMessage | Out-File -FilePath $errorLogFile -Append
    $_.ScriptStackTrace | Out-File -FilePath $errorLogFile -Append
} finally {
    if (fs.existsSync $logFile) {
        console.log "`nConsultez le fichier de log complet: $logFile" -ForegroundColor Cyan
    }
    if (fs.existsSync $errorLogFile -and (Get-Item $errorLogFile).Length -gt 0) {
        console.log "Des erreurs ont été enregistrées dans: $errorLogFile" -ForegroundColor Red
    }
}
