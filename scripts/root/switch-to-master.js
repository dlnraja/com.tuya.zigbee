#!/usr/bin/env node
'use strict';

/**
 * 🔄 Script converti automatiquement
 * Original: PS1
 * Converti le: 2025-09-03T20:43:40.954Z
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// 🔄 Script converti automatiquement de PS1 vers JavaScript
// ⚠️ Vérification manuelle recommandée

console.log "🚀 BASCULEMENT VERS MASTER ET FUSION..."; console.log "📋 État actuel:"; git status; console.log "🔄 Basculement vers master..."; git checkout master; console.log "📥 Récupération des dernières modifications..."; git pull origin master; console.log "🔄 Fusion de toutes les branches..."; git merge --no-ff tuya-light -m "Merge tuya-light into master - Complete project restructure"; console.log "✅ Fusion terminée !"; console.log "📤 Push vers master..."; git push origin master; console.log "🎉 BASCULEMENT COMPLET RÉUSSI !";
