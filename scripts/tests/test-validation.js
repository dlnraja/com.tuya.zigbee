#!/usr/bin/env node
'use strict';

/**
 * 🔄 Script converti automatiquement
 * Original: PS1
 * Converti le: 2025-09-03T20:43:41.427Z
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// 🔄 Script converti automatiquement de PS1 vers JavaScript
// ⚠️ Vérification manuelle recommandée

console.log "🔍 TEST VALIDATION HOMEY" -ForegroundColor Green
console.log "=========================" -ForegroundColor Green

console.log "`n📂 Vérification de app.json..." -ForegroundColor Yellow
if (fs.existsSync "app.json") {
    console.log "✅ app.json trouvé" -ForegroundColor Green
    
    # Vérifier la taille
    $size = (Get-Item "app.json").Length
    console.log "📊 Taille: $size bytes" -ForegroundColor Cyan
    
    # Vérifier le contenu des clusters
    $content = fs.readFileSync "app.json" -Raw
    if ($content -match '"clusters":\s*\[[^\]]*\]') {
        console.log "✅ Section clusters trouvée" -ForegroundColor Green
        
        # Vérifier si les clusters sont numériques
        if ($content -match '"clusters":\s*\[\s*\d+') {
            console.log "✅ Clusters numériques détectés" -ForegroundColor Green
        } else {
            console.log "❌ Clusters non numériques détectés" -ForegroundColor Red
        }
    } else {
        console.log "❌ Section clusters non trouvée" -ForegroundColor Red
    }
} else {
    console.log "❌ app.json non trouvé" -ForegroundColor Red
}

console.log "`n🚀 Test de validation Homey..." -ForegroundColor Yellow
try {
    $result = homey app validate 2>&1
    console.log "✅ Validation terminée" -ForegroundColor Green
    console.log "📋 Résultat:" -ForegroundColor Cyan
    console.log $result
} catch {
    console.log "❌ Erreur de validation: $($_.Exception.Message)" -ForegroundColor Red
}

console.log "`n🎯 Test terminé" -ForegroundColor Green
