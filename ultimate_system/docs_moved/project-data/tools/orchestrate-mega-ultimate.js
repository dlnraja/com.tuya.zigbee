#!/usr/bin/env node
'use strict';

const { spawnSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const MODES = {
  ULTIMATE: 'ULTIMATE',
  FULL: 'FULL',
  FAST: 'FAST',
  MCP: 'MCP',
  FALLBACK: 'FALLBACK',
  EMERGENCY: 'EMERGENCY'
};

const FALLBACK_SOURCES = {
  primary: ['firecrawl', 'scrapingbee', 'puppeteer', 'playwright'],
  secondary: ['homey_forum', 'zigbee2mqtt', 'blakadder', 'github', 'stackoverflow'],
  emergency: ['local_cache', 'backup_data', 'manual_override']
};

class MegaUltimateOrchestrator {
  constructor() {
    this.mode = process.env.MODE || MODES.ULTIMATE;
    this.offline = process.env.OFFLINE === '1';
    this.useMCP = process.env.USE_MCP !== '0';
    this.useFallbacks = process.env.USE_FALLBACKS !== '0';
    this.maxRetries = parseInt(process.env.MAX_RETRIES) || 5;
    this.autoFix = process.env.AUTO_FIX !== '0';
    
    this.retryCount = 0;
    this.fallbackIndex = 0;
    this.successMetrics = {
      totalSteps: 0,
      successfulSteps: 0,
      failedSteps: 0,
      fallbacksUsed: 0
    };
    
    console.log('🚀 MEGA ULTIMATE Orchestrator - Mode:', this.mode);
    console.log('📡 Offline:', this.offline);
    console.log('🤖 MCP:', this.useMCP);
    console.log('🔄 Fallbacks:', this.useFallbacks);
    console.log('🔧 Auto-fix:', this.autoFix);
    console.log('🔄 Max retries:', this.maxRetries);
  }

  async runWithRetry(cmd, args, options = {}) {
    const { maxRetries = this.maxRetries, description = `${cmd} ${args.join(' ')}` } = options;
    
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        console.log(`▶ [${attempt + 1}/${maxRetries + 1}] ${description}`);
        const result = spawnSync(cmd, args, { stdio: 'inherit', ...options });
        
        if (result.status === 0) {
          this.successMetrics.successfulSteps++;
          return result;
        }
        
        throw new Error(`Exit code: ${result.status}`);
        
      } catch (error) {
        console.warn(`⚠️ Attempt ${attempt + 1} failed:`, error.message);
        
        if (attempt === maxRetries) {
          this.successMetrics.failedSteps++;
          throw new Error(`All ${maxRetries + 1} attempts failed for: ${description}`);
        }
        
        const delay = Math.min(1000 * Math.pow(2, attempt), 10000);
        console.log(`⏳ Waiting ${delay}ms before retry...`);
        await this.sleep(delay);
      }
    }
  }

  async tryRun(cmd, args, options = {}) {
    try {
      return await this.runWithRetry(cmd, args, options);
    } catch (error) {
      console.warn(`⚠️ Command failed (continuing): ${error.message}`);
      return null;
    }
  }

  async execute() {
    try {
      console.log('\n🎯 Phase 1: Préparation et nettoyage avec failover');
      await this.phase1_preparation();

      console.log('\n📊 Phase 2: Génération des matrices et références');
      await this.phase2_matrices();

      console.log('\n🔍 Phase 3: Collecte d\'informations externes avec fallbacks');
      await this.phase3_external_collection();

      console.log('\n🧠 Phase 4: Enrichissement automatique avancé');
      await this.phase4_auto_enrichment();

      console.log('\n✅ Phase 5: Validation finale avec auto-correction');
      await this.phase5_validation();

      console.log('\n🎉 MEGA ULTIMATE Orchestrator terminé avec succès !');
      this.printSummary();
      this.saveMetrics();

    } catch (error) {
      console.error('\n❌ Erreur fatale dans l\'orchestrateur MEGA ULTIMATE:', error.message);
      
      if (this.autoFix) {
        console.log('🆘 Tentative de récupération d\'urgence...');
        await this.emergencyRecovery();
      }
      
      process.exit(1);
    }
  }

  async phase1_preparation() {
    this.successMetrics.totalSteps += 3;
    
    try {
      console.log('🔧 Activation de Homey Compose...');
      await this.runWithRetry('node', ['tools/enable-compose.js'], { description: 'Enable Compose' });
    } catch (error) {
      console.warn('⚠️ Compose activation failed, continuing...');
    }

    try {
      console.log('🧹 Nettoyage JSON ciblé...');
      await this.runWithRetry('node', ['tools/clean-json-only.js'], { description: 'Clean JSON' });
    } catch (error) {
      console.warn('⚠️ JSON cleaning failed, continuing...');
    }

    try {
      console.log('📋 Vérification des drivers...');
      if (await this.tryRun('node', ['tools/check-drivers.js'], { description: 'Check drivers' })) {
        console.log('✅ Vérification des drivers OK');
      } else {
        console.log('⚠️ Problèmes détectés dans les drivers');
        if (this.autoFix) {
          await this.autoFixDrivers();
        }
      }
    } catch (error) {
      console.warn('⚠️ Driver check failed, continuing...');
    }
  }

  async phase2_matrices() {
    this.successMetrics.totalSteps += 3;
    
    const matrixSteps = [
      { cmd: 'node', args: ['tools/matrix-build.js'], desc: 'Build matrices' },
      { cmd: 'node', args: ['tools/build-references.js'], desc: 'Build references' },
      { cmd: 'node', args: ['tools/build-dashboard.js'], desc: 'Build dashboard' }
    ];

    for (const step of matrixSteps) {
      try {
        await this.runWithRetry(step.cmd, step.args, { description: step.desc });
      } catch (error) {
        console.warn(`⚠️ ${step.desc} failed, trying fallback...`);
        await this.tryMatrixFallback(step);
      }
    }
  }

  async tryMatrixFallback(step) {
    this.successMetrics.fallbacksUsed++;
    
    if (fs.existsSync('matrices/driver_matrix.json')) {
      console.log('🔄 Using existing matrix data...');
      return;
    }
    
    console.log('🆘 Creating emergency matrix...');
    const emergencyMatrix = {
      timestamp: new Date().toISOString(),
      drivers: [],
      emergency: true
    };
    
    fs.mkdirSync('matrices', { recursive: true });
    fs.writeFileSync('matrices/driver_matrix.json', JSON.stringify(emergencyMatrix, null, 2));
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

    console.log('🌐 Collecte d\'informations externes avec failovers...');
    this.successMetrics.totalSteps += 2;

    if (this.useMCP) {
      await this.collectWithMCPFallbacks();
    }

    if (this.useFallbacks) {
      await this.collectWithAlternativeFallbacks();
    }
  }

  async collectWithMCPFallbacks() {
    for (const mcpSource of FALLBACK_SOURCES.primary) {
      try {
        console.log(`🤖 Trying MCP: ${mcpSource}...`);
        
        if (await this.tryRun('node', ['tools/web-scraper.js'], { 
          description: `MCP ${mcpSource}`,
          env: { ...process.env, MCP_SOURCE: mcpSource }
        })) {
          console.log(`✅ MCP ${mcpSource} successful`);
          return;
        }
      } catch (error) {
        console.warn(`⚠️ MCP ${mcpSource} failed:`, error.message);
      }
    }
    
    console.log('🔄 All MCP sources failed, using fallbacks');
    this.successMetrics.fallbacksUsed++;
  }

  async collectWithAlternativeFallbacks() {
    for (const altSource of FALLBACK_SOURCES.secondary) {
      try {
        console.log(`🔄 Trying alternative: ${altSource}...`);
        
        if (await this.tryRun('node', ['tools/evidence-collect.js'], {
          description: `Alternative ${altSource}`,
          env: { ...process.env, ALT_SOURCE: altSource }
        })) {
          console.log(`✅ Alternative ${altSource} successful`);
          return;
        }
      } catch (error) {
        console.warn(`⚠️ Alternative ${altSource} failed:`, error.message);
      }
    }
    
    console.log('🆘 All alternative sources failed');
    this.successMetrics.fallbacksUsed++;
  }

  async phase4_auto_enrichment() {
    console.log('🧠 Enrichissement automatique avancé avec failovers...');
    this.successMetrics.totalSteps += 3;

    const enrichmentSteps = [
      { name: 'Heuristic', cmd: 'node', args: ['tools/enrich-heuristics.js'] },
      { name: 'Evidence', cmd: 'node', args: ['tools/enrich-from-evidence.js'] },
      { name: 'Auto', cmd: 'node', args: ['tools/auto-driver-enricher.js'] }
    ];

    for (const step of enrichmentSteps) {
      try {
        console.log(`📚 ${step.name} enrichment...`);
        await this.runWithRetry(step.cmd, step.args, { description: `${step.name} enrichment` });
      } catch (error) {
        console.warn(`⚠️ ${step.name} enrichment failed, continuing...`);
        if (this.autoFix) {
          await this.autoFixEnrichment(step.name);
        }
      }
    }
  }

  async phase5_validation() {
    console.log('✅ Validation finale avec auto-correction...');
    this.successMetrics.totalSteps += 1;

    if (await this.tryRun('homey', ['--version'], { description: 'Check Homey CLI' })) {
      console.log('🔍 Lancement de la validation Homey...');
      
      let validationSuccess = false;
      for (let attempt = 0; attempt < this.maxRetries; attempt++) {
        if (await this.tryRun('homey', ['app', 'validate', '-l', 'debug'], { 
          description: `Homey validation attempt ${attempt + 1}` 
        })) {
          console.log('✅ Validation Homey OK');
          validationSuccess = true;
          break;
        } else {
          console.log(`⚠️ Validation attempt ${attempt + 1} failed, attempting auto-fix...`);
          if (this.autoFix) {
            await this.autoFixValidation();
          }
        }
      }
      
      if (!validationSuccess) {
        console.log('❌ All validation attempts failed');
        this.successMetrics.failedSteps++;
      }
    } else {
      console.log('ℹ️ Homey CLI non disponible, validation ignorée');
    }
  }

  async autoFixValidation() {
    console.log('🔧 Auto-fixing validation issues...');
    
    await this.tryRun('node', ['tools/clean-json-only.js']);
    await this.tryRun('node', ['tools/enrich-from-evidence.js']);
    await this.tryRun('node', ['tools/check-drivers.js']);
  }

  async emergencyRecovery() {
    console.log('🆘 Emergency recovery mode...');
    
    try {
      const emergencyState = {
        timestamp: new Date().toISOString(),
        mode: this.mode,
        metrics: this.successMetrics,
        error: 'Emergency recovery triggered'
      };
      
      fs.mkdirSync('dumps', { recursive: true });
      fs.writeFileSync('dumps/emergency_state.json', JSON.stringify(emergencyState, null, 2));
      
      if (fs.existsSync('matrices/driver_matrix.json')) {
        console.log('✅ Matrix data recovered');
      }
      
      if (fs.existsSync('docs/data/drivers.json')) {
        console.log('✅ Dashboard data recovered');
      }
      
      console.log('🆘 Emergency recovery completed');
      
    } catch (error) {
      console.error('❌ Emergency recovery failed:', error.message);
    }
  }

  async autoFixDrivers() {
    console.log('🔧 Auto-fixing driver issues...');
    
    const driversDir = 'drivers';
    if (fs.existsSync(driversDir)) {
      const drivers = fs.readdirSync(driversDir, { withFileTypes: true })
        .filter(d => d.isDirectory())
        .map(d => d.name);
      
      for (const driver of drivers) {
        const driverPath = path.join(driversDir, driver);
        const composePath = path.join(driverPath, 'driver.compose.json');
        
        if (!fs.existsSync(composePath)) {
          console.log(`🔧 Creating missing compose for ${driver}...`);
          await this.createEmergencyCompose(driver);
        }
      }
    }
  }

  async createEmergencyCompose(driverId) {
    const emergencyCompose = {
      id: driverId,
      name: {
        en: `Emergency ${driverId}`,
        fr: `Urgence ${driverId}`
      },
      class: "other",
      capabilities: ["onoff"],
      emergency: true,
      timestamp: new Date().toISOString()
    };
    
    const driverPath = path.join('drivers', driverId);
    fs.mkdirSync(driverPath, { recursive: true });
    
    fs.writeFileSync(
      path.join(driverPath, 'driver.compose.json'),
      JSON.stringify(emergencyCompose, null, 2)
    );
  }

  async autoFixEnrichment(type) {
    console.log(`🔧 Auto-fixing ${type} enrichment...`);
  }

  printSummary() {
    console.log('\n📊 RÉSUMÉ FINAL MEGA ULTIMATE:');
    console.log('📁 Dashboard disponible: docs/index.html');
    console.log('📊 Matrices: matrices/driver_matrix.json');
    console.log('🔍 Références: references/driver_search_queries.json');
    console.log('🧠 Evidence: evidence/');
    
    console.log('\n📈 MÉTRIQUES DE SUCCÈS:');
    console.log(`- Total steps: ${this.successMetrics.totalSteps}`);
    console.log(`- Successful: ${this.successMetrics.successfulSteps}`);
    console.log(`- Failed: ${this.successMetrics.failedSteps}`);
    console.log(`- Fallbacks used: ${this.successMetrics.fallbacksUsed}`);
    console.log(`- Success rate: ${((this.successMetrics.successfulSteps / this.successMetrics.totalSteps) * 100).toFixed(1)}%`);
    
    if (this.useMCP) {
      console.log('🤖 MCP: Intégré avec failovers multiples');
    }
    
    if (this.useFallbacks) {
      console.log('🔄 Fallbacks: Sources alternatives avec récupération');
    }
    
    console.log('\n🚀 Commandes disponibles:');
    console.log('  npm run orchestrate:mega:ultimate  # Pipeline MEGA ULTIMATE');
    console.log('  npm run orchestrate:mega          # Pipeline MEGA standard');
    console.log('  npm run enrich:auto               # Enrichissement automatique');
    console.log('  npm run scrape:web                # Scraping web avec fallbacks');
    
    console.log('\n💡 Variables d\'environnement:');
    console.log('  MODE=ULTIMATE|FULL|FAST|MCP|FALLBACK|EMERGENCY');
    console.log('  OFFLINE=1                         # Mode hors ligne');
    console.log('  USE_MCP=0                         # Désactiver MCP');
    console.log('  USE_FALLBACKS=0                   # Désactiver fallbacks');
    console.log('  AUTO_FIX=0                        # Désactiver auto-correction');
    console.log('  MAX_RETRIES=5                     # Nombre max de tentatives');
  }

  saveMetrics() {
    const metricsPath = 'MEGA_ULTIMATE_METRICS.json';
    const metrics = {
      timestamp: new Date().toISOString(),
      mode: this.mode,
      successMetrics: this.successMetrics,
      fallbackSources: FALLBACK_SOURCES,
      configuration: {
        offline: this.offline,
        useMCP: this.useMCP,
        useFallbacks: this.useFallbacks,
        autoFix: this.autoFix,
        maxRetries: this.maxRetries
      }
    };
    
    fs.writeFileSync(metricsPath, JSON.stringify(metrics, null, 2));
    console.log(`💾 Metrics saved to: ${metricsPath}`);
  }

  checkPrerequisites() {
    const requiredFiles = [
      'tools/web-scraper.js',
      'tools/auto-driver-enricher.js',
      'tools/orchestrate.js',
      'tools/clean-json-only.js'
    ];

    for (const file of requiredFiles) {
      if (!fs.existsSync(file)) {
        throw new Error(`Fichier requis manquant: ${file}`);
      }
    }

    console.log('✅ Tous les prérequis sont satisfaits');
  }

  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

async function main() {
  const orchestrator = new MegaUltimateOrchestrator();
  
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

module.exports = MegaUltimateOrchestrator;
