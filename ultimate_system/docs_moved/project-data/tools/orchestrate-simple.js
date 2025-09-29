#!/usr/bin/env node
'use strict';
const { spawnSync } = require('child_process');
const fs = require('fs');

const MODE = process.env.MODE || 'FAST';
const OFFLINE = process.env.OFFLINE === '1';

function run(cmd, args, options = {}) {
  console.log('▶', cmd, args.join(' '));
  const result = spawnSync(cmd, args, { stdio: 'inherit', ...options });
  if (result.status !== 0) {
    throw new Error(`${cmd} failed with status ${result.status}`);
  }
  return result;
}

function tryRun(cmd, args, options = {}) {
  console.log('▶', cmd, args.join(' '));
  const result = spawnSync(cmd, args, { stdio: 'inherit', ...options });
  return result.status === 0;
}

try {
  console.log('🚀 Orchestrateur simplifié - Mode:', MODE, 'Offline:', OFFLINE);
  
  // 0) Nettoyage JSON ciblé (ignore les backups)
  console.log('\n🧹 Étape 0: Nettoyage JSON ciblé...');
  run('node', ['tools/clean-json-only.js']);
  
  // 1) Activation Compose
  console.log('\n🔧 Étape 1: Activation Homey Compose...');
  run('node', ['tools/enable-compose.js']);
  
  // 2) Vérification des drivers
  console.log('\n📋 Étape 2: Vérification des drivers...');
  if (tryRun('node', ['tools/check-drivers.js'])) {
    console.log('✅ Vérification des drivers OK');
  } else {
    console.log('⚠️  Problèmes détectés dans les drivers');
  }
  
  // 3) Génération des matrices
  console.log('\n📊 Étape 3: Génération des matrices...');
  if (tryRun('node', ['tools/matrix-build.js'])) {
    console.log('✅ Matrices générées');
  } else {
    console.log('⚠️  Erreur lors de la génération des matrices');
  }
  
  // 4) Génération des références
  console.log('\n🔍 Étape 4: Génération des références...');
  if (tryRun('node', ['tools/build-references.js'])) {
    console.log('✅ Références générées');
  } else {
    console.log('⚠️  Erreur lors de la génération des références');
  }
  
  // 5) Construction du dashboard
  console.log('\n🎨 Étape 5: Construction du dashboard...');
  if (tryRun('node', ['tools/build-dashboard.js'])) {
    console.log('✅ Dashboard construit');
  } else {
    console.log('⚠️  Erreur lors de la construction du dashboard');
  }
  
  // 6) Enrichissement heuristique (mode FAST uniquement)
  if (MODE === 'FAST') {
    console.log('\n🧠 Étape 6: Enrichissement heuristique...');
    if (tryRun('node', ['tools/enrich-heuristics.js'])) {
      console.log('✅ Enrichissement heuristique terminé');
    } else {
      console.log('⚠️  Erreur lors de l\'enrichissement heuristique');
    }
  }
  
  // 7) Validation finale (si Homey CLI disponible)
  console.log('\n✅ Étape 7: Validation finale...');
  if (tryRun('homey', ['--version'])) {
    console.log('🔍 Lancement de la validation Homey...');
    if (tryRun('homey', ['app', 'validate', '-l', 'debug'])) {
      console.log('✅ Validation Homey OK');
    } else {
      console.log('⚠️  Validation Homey échouée');
    }
  } else {
    console.log('ℹ️  Homey CLI non disponible, validation ignorée');
  }
  
  console.log('\n🎉 Orchestrateur terminé avec succès !');
  console.log('📁 Dashboard disponible: docs/index.html');
  console.log('📊 Matrices: matrices/driver_matrix.json');
  console.log('🔍 Références: references/driver_search_queries.json');
  
} catch (error) {
  console.error('\n❌ Erreur dans l\'orchestrateur:', error.message);
  process.exit(1);
}
