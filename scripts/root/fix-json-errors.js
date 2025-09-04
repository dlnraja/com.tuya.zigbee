#!/usr/bin/env node
'use strict';

/**
 * 🔄 Script converti automatiquement
 * Original: PS1
 * Converti le: 2025-09-03T20:43:39.396Z
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// 🔄 Script converti automatiquement de PS1 vers JavaScript
// ⚠️ Vérification manuelle recommandée

# Script de correction des erreurs de parsing JSON dans les drivers
# Corrige les problèmes de duplication de clés et de syntaxe JSON
# 
# @author Dylan Rajasekaram (dlrnaja)
# @version 3.5.1
# @date 2025-08-16

param(
    [string]$DriversPath = "drivers"
)

console.log "🔧 CORRECTION DES ERREURS DE PARSING JSON..." -ForegroundColor Cyan
console.log "==========================================" -ForegroundColor Cyan

# Variables de suivi
$fixedFiles = @()
$errors = @()
$stats = @{
    total = 0
    fixed = 0
    errors = 0
}

# Fonction pour corriger les problèmes JSON courants
function Fix-JSONContent {
    param([string]$content)
    
    $fixed = $content
    
    # 1. Supprimer les clés productId dupliquées
    if ($fixed -match '("productId":\s*\[[^\]]+\],\s*)+') {
        console.log "  🔧 Suppression des clés productId dupliquées" -ForegroundColor Yellow
        $firstMatch = [regex]::Match($fixed, '"productId":\s*\[[^\]]+\]').Value
        $fixed = $fixed -replace '("productId":\s*\[[^\]]+\],\s*)+', "$firstMatch,"
    }
    
    # 2. Corriger les virgules trailing
    $fixed = $fixed -replace ',(\s*[}\]])', '$1'
    
    # 3. Nettoyer les caractères invisibles
    $fixed = $fixed -replace '[\x00-\x1F\x7F-\x9F]', ''
    
    return $fixed
}

# Fonction pour traiter un driver
function Process-Driver {
    param([string]$driverName)
    
    $driverPath = Join-Path $DriversPath $driverName
    $composePath = Join-Path $driverPath "driver.compose.json"
    
    if (-not (fs.existsSync $composePath)) {
        console.log "⚠️  $driverName`: driver.compose.json manquant" -ForegroundColor Yellow
        return
    }
    
    try {
        console.log "`n🔧 Traitement de $driverName..." -ForegroundColor Green
        
        # Lire le fichier
        $content = fs.readFileSync $composePath -Raw -Encoding UTF8
        
        # Vérifier si c'est du JSON valide
        try {
            $null = $content | ConvertFrom-Json
            console.log "✅ $driverName`: JSON déjà valide" -ForegroundColor Green
            return
        } catch {
            console.log "❌ $driverName`: Erreur de parsing détectée" -ForegroundColor Red
        }
        
        # Corriger le contenu
        $fixedContent = Fix-JSONContent -content $content
        
        # Vérifier à nouveau
        try {
            $null = $fixedContent | ConvertFrom-Json
            console.log "✅ $driverName`: JSON corrigé avec succès" -ForegroundColor Green
            
            # Sauvegarder
            fs.writeFileSync -Path $composePath -Value $fixedContent -Encoding UTF8
            $fixedFiles += @{
                driver = $driverName
                path = $composePath
                originalSize = $content.Length
                fixedSize = $fixedContent.Length
            }
            $stats.fixed++
            
        } catch {
            console.log "❌ $driverName`: Impossible de corriger - $($_.Exception.Message)" -ForegroundColor Red
            $errors += @{
                driver = $driverName
                error = $_.Exception.Message
                path = $composePath
            }
            $stats.errors++
        }
        
    } catch {
        console.log "❌ $driverName`: Erreur lors du traitement - $($_.Exception.Message)" -ForegroundColor Red
        $errors += @{
            driver = $driverName
            error = $_.Exception.Message
            path = $composePath
        }
        $stats.errors++
    }
}

# Traitement principal
try {
    if (-not (fs.existsSync $DriversPath)) {
        console.log "❌ Dossier $DriversPath non trouvé" -ForegroundColor Red
        exit 1
    }
    
    $drivers = fs.readdirSync -Path $DriversPath -Directory | // Select-Object equivalent -ExpandProperty Name
    $stats.total = $drivers.Count
    
    console.log "📁 $($stats.total) drivers à traiter" -ForegroundColor Cyan
    
    foreach ($driver in $drivers) {
        Process-Driver -driverName $driver
    }
    
    # Génération du rapport
    console.log "`n📊 RAPPORT DE CORRECTION JSON" -ForegroundColor Cyan
    console.log "==============================" -ForegroundColor Cyan
    console.log "Total drivers: $($stats.total)" -ForegroundColor White
    console.log "Fichiers corrigés: $($stats.fixed)" -ForegroundColor Green
    console.log "Erreurs persistantes: $($stats.errors)" -ForegroundColor Red
    console.log "Taux de succès: $([math]::Round(($stats.fixed / $stats.total) * 100, 1))%" -ForegroundColor Cyan
    
    if ($fixedFiles.Count -gt 0) {
        console.log "`n✅ FICHIERS CORRIGÉS:" -ForegroundColor Green
        foreach ($file in $fixedFiles) {
            console.log "  - $($file.driver): $($file.originalSize) → $($file.fixedSize) bytes" -ForegroundColor White
        }
    }
    
    if ($errors.Count -gt 0) {
        console.log "`n❌ ERREURS PERSISTANTES:" -ForegroundColor Red
        foreach ($error in $errors) {
            console.log "  - $($error.driver): $($error.error)" -ForegroundColor White
        }
    }
    
    # Sauvegarder le rapport
    $report = @{
        timestamp = (new Date()).ToString("yyyy-MM-ddTHH:mm:ss.fffZ")
        stats = $stats
        fixedFiles = $fixedFiles
        errors = $errors
    }
    
    $reportPath = "JSON_PARSING_FIX_REPORT.json"
    $report | ConvertTo-Json -Depth 10 | fs.writeFileSync $reportPath -Encoding UTF8
    console.log "`n📄 Rapport sauvegardé: $reportPath" -ForegroundColor Cyan
    
    console.log "`n🎉 CORRECTION TERMINÉE !" -ForegroundColor Green
    console.log "Prochaine étape: validation avec homey app validate" -ForegroundColor Yellow
    
} catch {
    console.log "❌ ERREUR CRITIQUE: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}
