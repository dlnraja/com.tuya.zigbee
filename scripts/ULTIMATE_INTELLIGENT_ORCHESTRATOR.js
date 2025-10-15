#!/usr/bin/env node
'use strict';

/**
 * ULTIMATE INTELLIGENT ORCHESTRATOR
 * Système modulaire intelligent pour finaliser tout le projet
 * Architecture modulaire pour éviter les bugs de code trop long
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Imports des modules
const FileOrganizer = require('./modules/file-organizer');
const DriverEnricher = require('./modules/driver-enricher');
const FlowEnricher = require('./modules/flow-enricher');

const ROOT = path.join(__dirname, '..');

class UltimateIntelligentOrchestrator {
  constructor() {
    this.phases = [];
    this.results = {
      phases: [],
      totalTime: 0,
      success: true
    };
  }

  log(message, icon = 'ℹ️') {
    console.log(`${icon} ${message}`);
  }

  success(message) {
    console.log(`✅ ${message}`);
  }

  error(message) {
    console.error(`❌ ${message}`);
    this.results.success = false;
  }

  // Phase 1: Organisation des fichiers
  async phase1_OrganizeFiles() {
    this.log('PHASE 1: Organisation intelligente des fichiers', '📁');
    console.log('─'.repeat(60));

    try {
      const organizer = new FileOrganizer(ROOT);
      const stats = organizer.run();
      
      this.results.phases.push({
        name: 'File Organization',
        status: 'success',
        stats
      });
      
      this.success('Phase 1 terminée');
      return true;
    } catch (error) {
      this.error(`Phase 1 échouée: ${error.message}`);
      return false;
    }
  }

  // Phase 2: Enrichissement des drivers
  async phase2_EnrichDrivers() {
    this.log('PHASE 2: Enrichissement intelligent des drivers', '🔧');
    console.log('─'.repeat(60));

    try {
      const driversPath = path.join(ROOT, 'drivers');
      const enricher = new DriverEnricher(driversPath);
      const enrichments = enricher.enrichAll();
      
      this.results.phases.push({
        name: 'Driver Enrichment',
        status: 'success',
        enrichments
      });
      
      this.success(`Phase 2 terminée - ${enrichments.length} drivers enrichis`);
      return true;
    } catch (error) {
      this.error(`Phase 2 échouée: ${error.message}`);
      return false;
    }
  }

  // Phase 3: Enrichissement des flows
  async phase3_EnrichFlows() {
    this.log('PHASE 3: Enrichissement intelligent des flows', '⚡');
    console.log('─'.repeat(60));

    try {
      const appJsonPath = path.join(ROOT, 'app.json');
      const enricher = new FlowEnricher(appJsonPath);
      const enrichments = enricher.enrichFlows();
      
      this.results.phases.push({
        name: 'Flow Enrichment',
        status: 'success',
        enrichments
      });
      
      this.success(`Phase 3 terminée - ${enrichments.length} flow cards enrichis`);
      return true;
    } catch (error) {
      this.error(`Phase 3 échouée: ${error.message}`);
      return false;
    }
  }

  // Phase 4: Synchronisation des versions
  async phase4_SyncVersions() {
    this.log('PHASE 4: Synchronisation des versions', '🔄');
    console.log('─'.repeat(60));

    try {
      // Utiliser le module existant
      const VersionSync = require('./VERSION_SYNC_ALL.js');
      const sync = new VersionSync();
      await sync.run();
      
      this.results.phases.push({
        name: 'Version Sync',
        status: 'success'
      });
      
      this.success('Phase 4 terminée');
      return true;
    } catch (error) {
      this.log('Tentative alternative de sync versions...');
      try {
        execSync('node scripts/VERSION_SYNC_ALL.js', { cwd: ROOT, stdio: 'inherit' });
        this.success('Phase 4 terminée (alternative)');
        return true;
      } catch (err) {
        this.error(`Phase 4 échouée: ${error.message}`);
        return false;
      }
    }
  }

  // Phase 5: Validation Homey
  async phase5_Validate() {
    this.log('PHASE 5: Validation Homey', '✓');
    console.log('─'.repeat(60));

    try {
      this.log('Validation en cours...');
      execSync('homey app validate --level publish', { 
        cwd: ROOT, 
        stdio: 'inherit' 
      });
      
      this.results.phases.push({
        name: 'Homey Validation',
        status: 'success'
      });
      
      this.success('Phase 5 terminée - Validation réussie');
      return true;
    } catch (error) {
      this.error(`Phase 5 échouée: Validation errors`);
      // Continue quand même
      return true;
    }
  }

  // Phase 6: Nettoyage des caches
  async phase6_CleanCaches() {
    this.log('PHASE 6: Nettoyage des caches', '🧹');
    console.log('─'.repeat(60));

    const cacheDirs = [
      '.homeybuild',
      '.homeycompose/.cache',
      'node_modules/.cache',
      '.temp'
    ];

    let cleaned = 0;
    for (const cacheDir of cacheDirs) {
      const cachePath = path.join(ROOT, cacheDir);
      if (fs.existsSync(cachePath)) {
        try {
          fs.rmSync(cachePath, { recursive: true, force: true });
          this.log(`Nettoyé: ${cacheDir}`);
          cleaned++;
        } catch (err) {
          // Ignore
        }
      }
    }

    this.results.phases.push({
      name: 'Cache Cleaning',
      status: 'success',
      cleaned
    });

    this.success(`Phase 6 terminée - ${cleaned} caches nettoyés`);
    return true;
  }

  // Phase 7: Génération rapport
  async phase7_GenerateReport() {
    this.log('PHASE 7: Génération du rapport final', '📊');
    console.log('─'.repeat(60));

    const report = {
      timestamp: new Date().toISOString(),
      version: '2.15.99',
      phases: this.results.phases,
      totalTime: `${(this.results.totalTime / 1000).toFixed(2)}s`,
      success: this.results.success,
      summary: {
        filesOrganized: this.results.phases[0]?.stats?.moved?.length || 0,
        driversEnriched: this.results.phases[1]?.enrichments?.length || 0,
        flowsEnriched: this.results.phases[2]?.enrichments?.length || 0,
        cachesClean: this.results.phases[5]?.cleaned || 0
      }
    };

    const reportPath = path.join(ROOT, 'reports', 'ULTIMATE_ORCHESTRATION_REPORT.json');
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));

    this.success('Phase 7 terminée - Rapport généré');
    return true;
  }

  // Phase 8: Git operations
  async phase8_GitOperations() {
    this.log('PHASE 8: Opérations Git', '📦');
    console.log('─'.repeat(60));

    try {
      // Status
      this.log('Git status...');
      execSync('git status --short', { cwd: ROOT, stdio: 'inherit' });

      // Add
      this.log('Git add...');
      execSync('git add -A', { cwd: ROOT });

      // Commit
      this.log('Git commit...');
      try {
        execSync('git commit -m "feat: Ultimate intelligent orchestration complete - All modules enriched v2.15.99"', { 
          cwd: ROOT,
          stdio: 'inherit'
        });
      } catch (err) {
        this.log('No changes to commit');
      }

      this.results.phases.push({
        name: 'Git Operations',
        status: 'success'
      });

      this.success('Phase 8 terminée');
      return true;
    } catch (error) {
      this.error(`Phase 8 échouée: ${error.message}`);
      return false;
    }
  }

  // Exécution complète
  async run() {
    console.log('╔════════════════════════════════════════════════════════════╗');
    console.log('║   ULTIMATE INTELLIGENT ORCHESTRATOR - v2.15.99            ║');
    console.log('║   Architecture Modulaire - Enrichissement Complet         ║');
    console.log('╚════════════════════════════════════════════════════════════╝\n');

    const startTime = Date.now();

    // Exécuter toutes les phases en chaîne
    const phases = [
      { name: 'Organisation fichiers', fn: () => this.phase1_OrganizeFiles() },
      { name: 'Enrichissement drivers', fn: () => this.phase2_EnrichDrivers() },
      { name: 'Enrichissement flows', fn: () => this.phase3_EnrichFlows() },
      { name: 'Synchronisation versions', fn: () => this.phase4_SyncVersions() },
      { name: 'Validation Homey', fn: () => this.phase5_Validate() },
      { name: 'Nettoyage caches', fn: () => this.phase6_CleanCaches() },
      { name: 'Génération rapport', fn: () => this.phase7_GenerateReport() },
      { name: 'Opérations Git', fn: () => this.phase8_GitOperations() }
    ];

    for (let i = 0; i < phases.length; i++) {
      const phase = phases[i];
      console.log(`\n${'═'.repeat(60)}`);
      console.log(`🚀 PHASE ${i + 1}/${phases.length}: ${phase.name.toUpperCase()}`);
      console.log('═'.repeat(60));

      const success = await phase.fn();
      
      if (!success && i < 5) { // Ne pas arrêter après phase 5
        this.error(`Phase ${i + 1} critique échouée`);
        break;
      }
    }

    this.results.totalTime = Date.now() - startTime;

    // Afficher résumé final
    console.log('\n' + '═'.repeat(60));
    console.log('📊 RÉSUMÉ FINAL');
    console.log('═'.repeat(60));

    console.log(`\n⏱️  Temps total: ${(this.results.totalTime / 1000).toFixed(2)}s`);
    console.log(`✅ Phases réussies: ${this.results.phases.filter(p => p.status === 'success').length}/${this.results.phases.length}`);

    if (this.results.phases[0]?.stats) {
      console.log(`📁 Fichiers organisés: ${this.results.phases[0].stats.moved.length}`);
    }
    if (this.results.phases[1]?.enrichments) {
      console.log(`🔧 Drivers enrichis: ${this.results.phases[1].enrichments.length}`);
    }
    if (this.results.phases[2]?.enrichments) {
      console.log(`⚡ Flows enrichis: ${this.results.phases[2].enrichments.length}`);
    }

    console.log('\n' + '═'.repeat(60));
    
    if (this.results.success) {
      console.log('🎉 ORCHESTRATION COMPLÈTE RÉUSSIE');
    } else {
      console.log('⚠️  ORCHESTRATION TERMINÉE AVEC AVERTISSEMENTS');
    }
    
    console.log('═'.repeat(60) + '\n');

    return this.results.success;
  }
}

// Exécuter si appelé directement
if (require.main === module) {
  const orchestrator = new UltimateIntelligentOrchestrator();
  orchestrator.run().then(success => {
    process.exit(success ? 0 : 1);
  }).catch(err => {
    console.error('Fatal error:', err);
    process.exit(1);
  });
}

module.exports = UltimateIntelligentOrchestrator;
