#!/usr/bin/env node
'use strict';

const { spawnSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const MODES = {
  FULL: 'FULL',
  FAST: 'FAST',
  MCP: 'MCP',
  FALLBACK: 'FALLBACK'
};

class MegaOrchestrator {
  constructor() {
    this.mode = process.env.MODE || MODES.FULL;
    this.offline = process.env.OFFLINE === '1';
    this.useMCP = process.env.USE_MCP !== '0';
    this.useFallbacks = process.env.USE_FALLBACKS !== '0';
    
    console.log('🚀 MEGA Orchestrator - Mode:', this.mode);
    console.log('📡 Offline:', this.offline);
    console.log('🤖 MCP:', this.useMCP);
    console.log('🔄 Fallbacks:', this.useFallbacks);
  }

  run(cmd, args, options = {}) {
    console.log('▶', cmd, args.join(' '));
    const result = spawnSync(cmd, args, { stdio: 'inherit', ...options });
    if (result.status !== 0) {
      throw new Error(`${cmd} failed with status ${result.status}`);
    }
    return result;
  }

  tryRun(cmd, args, options = {}) {
    console.log('▶', cmd, args.join(' '));
    const result = spawnSync(cmd, args, { stdio: 'inherit', ...options });
    return result.status === 0;
  }

  async execute() {
    try {
      console.log('\n🎯 Phase 1: Préparation et nettoyage');
      await this.phase1_preparation();

      console.log('\n📊 Phase 2: Génération des matrices et références');
      await this.phase2_matrices();

      console.log('\n🔍 Phase 3: Collecte d\'informations externes');
      await this.phase3_external_collection();

      console.log('\n🧠 Phase 4: Enrichissement automatique');
      await this.phase4_auto_enrichment();

      console.log('\n✅ Phase 5: Validation finale');
      await this.phase5_validation();

      console.log('\n🎉 MEGA Orchestrator terminé avec succès !');
      this.printSummary();

    } catch (error) {
      console.error('\n❌ Erreur dans l\'orchestrateur MEGA:', error.message);
      process.exit(1);
    }
  }

  async phase1_preparation() {
    console.log('🔧 Activation de Homey Compose...');
    this.run('node', ['tools/enable-compose.js']);

    console.log('🧹 Nettoyage JSON ciblé...');
    this.run('node', ['tools/clean-json-only.js']);

    console.log('📋 Vérification des drivers...');
    if (this.tryRun('node', ['tools/check-drivers.js'])) {
      console.log('✅ Vérification des drivers OK');
    } else {
      console.log('⚠️ Problèmes détectés dans les drivers');
    }
  }

  async phase2_matrices() {
    console.log('📊 Génération des matrices...');
    this.run('node', ['tools/matrix-build.js']);

    console.log('🔍 Génération des références...');
    this.run('node', ['tools/build-references.js']);

    console.log('🎨 Construction du dashboard...');
    this.run('node', ['tools/build-dashboard.js']);
  }

  async phase3_external_collection() {
    if (this.offline) {
      console.log('📴 Mode hors ligne - collecte externe ignorée');
      return;
    }

    if (this.mode === MODES.FAST) {
      console.log('⚡ Mode rapide - collecte externe limitée');
      return;
    }

    console.log('🌐 Collecte d\'informations externes...');

    if (this.useMCP) {
      console.log('🤖 Collecte via MCP (Firecrawl)...');
      if (this.tryRun('node', ['tools/web-scraper.js'])) {
        console.log('✅ Collecte MCP terminée');
      } else {
        console.log('⚠️ Collecte MCP échouée');
      }
    }

    if (this.useFallbacks) {
      console.log('🔄 Collecte via sources alternatives...');
      if (this.tryRun('node', ['tools/evidence-collect.js'])) {
        console.log('✅ Collecte alternative terminée');
      } else {
        console.log('⚠️ Collecte alternative échouée');
      }
    }
  }

  async phase4_auto_enrichment() {
    console.log('🧠 Enrichissement automatique des drivers...');

    console.log('📚 Enrichissement heuristique...');
    if (this.tryRun('node', ['tools/enrich-heuristics.js'])) {
      console.log('✅ Enrichissement heuristique terminé');
    } else {
      console.log('⚠️ Enrichissement heuristique échoué');
    }

    if (fs.existsSync('evidence')) {
      console.log('🔍 Enrichissement depuis l\'evidence...');
      if (this.tryRun('node', ['tools/enrich-from-evidence.js'])) {
        console.log('✅ Enrichissement depuis l\'evidence terminé');
      } else {
        console.log('⚠️ Enrichissement depuis l\'evidence échoué');
      }
    }

    if (this.useMCP && this.mode === MODES.FULL) {
      console.log('🤖 Enrichissement automatique avancé...');
      if (this.tryRun('node', ['tools/auto-driver-enricher.js'])) {
        console.log('✅ Enrichissement automatique avancé terminé');
      } else {
        console.log('⚠️ Enrichissement automatique avancé échoué');
      }
    }
  }

  async phase5_validation() {
    console.log('✅ Validation finale...');

    if (this.tryRun('homey', ['--version'])) {
      console.log('🔍 Lancement de la validation Homey...');
      
      if (this.tryRun('homey', ['app', 'validate', '-l', 'debug'])) {
        console.log('✅ Validation Homey OK');
      } else {
        console.log('⚠️ Validation Homey échouée, tentative de correction...');
        await this.correctionLoop();
      }
    } else {
      console.log('ℹ️ Homey CLI non disponible, validation ignorée');
    }
  }

  async correctionLoop() {
    console.log('🔧 Tentative de correction automatique...');
    
    this.tryRun('node', ['tools/clean-json-only.js']);
    this.tryRun('node', ['tools/enrich-from-evidence.js']);
    
    if (this.tryRun('homey', ['app', 'validate', '-l', 'debug'])) {
      console.log('✅ Correction réussie !');
    } else {
      console.log('❌ Correction échouée. Vérifiez manuellement.');
    }
  }

  printSummary() {
    console.log('\n📊 RÉSUMÉ FINAL:');
    console.log('📁 Dashboard disponible: docs/index.html');
    console.log('📊 Matrices: matrices/driver_matrix.json');
    console.log('🔍 Références: references/driver_search_queries.json');
    console.log('🧠 Evidence: evidence/');
    
    if (this.useMCP) {
      console.log('🤖 MCP: Intégré avec Firecrawl');
    }
    
    if (this.useFallbacks) {
      console.log('🔄 Fallbacks: Sources alternatives activées');
    }
    
    console.log('\n🚀 Commandes disponibles:');
    console.log('  npm run orchestrate:mega    # Pipeline complet MEGA');
    console.log('  npm run enrich:auto        # Enrichissement automatique');
    console.log('  npm run scrape:web         # Scraping web avec fallbacks');
    console.log('  npm run matrix             # Génération des matrices');
    
    console.log('\n💡 Variables d\'environnement:');
    console.log('  MODE=FULL|FAST|MCP|FALLBACK');
    console.log('  OFFLINE=1                  # Mode hors ligne');
    console.log('  USE_MCP=0                  # Désactiver MCP');
    console.log('  USE_FALLBACKS=0            # Désactiver fallbacks');
  }

  checkPrerequisites() {
    const requiredFiles = [
      'tools/web-scraper.js',
      'tools/auto-driver-enricher.js',
      'tools/orchestrate.js'
    ];

    for (const file of requiredFiles) {
      if (!fs.existsSync(file)) {
        throw new Error(`Fichier requis manquant: ${file}`);
      }
    }

    console.log('✅ Tous les prérequis sont satisfaits');
  }
}

async function main() {
  const orchestrator = new MegaOrchestrator();
  
  try {
    orchestrator.checkPrerequisites();
    await orchestrator.execute();
  } catch (error) {
    console.error('❌ Erreur fatale:', error.message);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

module.exports = MegaOrchestrator;
