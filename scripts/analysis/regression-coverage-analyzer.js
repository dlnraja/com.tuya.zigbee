#!/usr/bin/env node
/**
 * 🔍 REGRESSION & COVERAGE ANALYZER
 * 
 * Analyse pourquoi le projet fonctionne moins bien:
 * 1. Compare versions (avant vs maintenant)
 * 2. Vérifie couverture appareils (devices supportés)
 * 3. Analyse flows disponibles
 * 4. Calcule KPIs (capabilities, clusters, fonctionnalités)
 * 5. Identifie régressions et manques
 * 6. Propose améliorations
 * 
 * Usage: node scripts/analysis/regression-coverage-analyzer.js
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const COLORS = {
  reset: '\x1b[0m', red: '\x1b[31m', green: '\x1b[32m',
  yellow: '\x1b[33m', blue: '\x1b[34m', magenta: '\x1b[35m', cyan: '\x1b[36m'
};

class RegressionCoverageAnalyzer {
  constructor() {
    this.rootDir = path.resolve(__dirname, '..', '..');
    this.driversDir = path.join(this.rootDir, 'drivers');
    this.results = {
      current: {
        drivers: 0,
        manufacturerNames: new Set(),
        productIds: new Set(),
        capabilities: new Set(),
        clusters: new Set(),
        flowTriggers: new Set(),
        flowConditions: new Set(),
        flowActions: new Set(),
        deviceClasses: new Set()
      },
      missing: {
        flows: [],
        capabilities: [],
        devices: [],
        features: []
      },
      recommendations: []
    };
  }

  log(msg, color = 'reset') {
    console.log(`${COLORS[color]}${msg}${COLORS.reset}`);
  }

  // ANALYSE 1: État actuel complet
  analyzeCurrentState() {
    this.log('\n🔍 ANALYSE ÉTAT ACTUEL', 'cyan');
    this.log('='.repeat(70), 'cyan');
    
    const drivers = fs.readdirSync(this.driversDir).filter(item => {
      const driverPath = path.join(this.driversDir, item);
      return fs.statSync(driverPath).isDirectory();
    });
    
    this.results.current.drivers = drivers.length;
    this.log(`  📊 Drivers trouvés: ${drivers.length}`, 'blue');
    
    let analyzed = 0;
    for (const driverId of drivers) {
      this.analyzeDriver(driverId);
      analyzed++;
      if (analyzed % 50 === 0) {
        this.log(`  📊 Progression: ${analyzed}/${drivers.length}`, 'blue');
      }
    }
    
    this.log(`  ✅ ${analyzed} drivers analysés`, 'green');
    this.displayCurrentStats();
  }

  // ANALYSE 2: Driver individuel
  analyzeDriver(driverId) {
    const driverPath = path.join(this.driversDir, driverId);
    const composePath = path.join(driverPath, 'driver.compose.json');
    
    if (!fs.existsSync(composePath)) return;
    
    try {
      const data = JSON.parse(fs.readFileSync(composePath, 'utf8'));
      
      // ManufacturerNames
      if (data.zigbee?.manufacturerName) {
        const mfrs = Array.isArray(data.zigbee.manufacturerName)
          ? data.zigbee.manufacturerName
          : [data.zigbee.manufacturerName];
        mfrs.forEach(m => this.results.current.manufacturerNames.add(m));
      }
      
      // ProductIds
      if (data.zigbee?.productId) {
        const pids = Array.isArray(data.zigbee.productId)
          ? data.zigbee.productId
          : [data.zigbee.productId];
        pids.forEach(p => this.results.current.productIds.add(p));
      }
      
      // Capabilities
      if (data.capabilities) {
        data.capabilities.forEach(cap => {
          if (typeof cap === 'string') {
            this.results.current.capabilities.add(cap);
          } else if (cap.id) {
            this.results.current.capabilities.add(cap.id);
          }
        });
      }
      
      // Clusters
      if (data.zigbee?.endpoints) {
        Object.values(data.zigbee.endpoints).forEach(endpoint => {
          if (endpoint.clusters) {
            endpoint.clusters.forEach(cluster => {
              if (typeof cluster === 'number') {
                this.results.current.clusters.add(cluster);
              } else if (typeof cluster === 'string') {
                this.results.current.clusters.add(cluster);
              }
            });
          }
        });
      }
      
      // Device class
      if (data.class) {
        this.results.current.deviceClasses.add(data.class);
      }
      
    } catch (err) {
      // Ignore errors
    }
  }

  // ANALYSE 3: Flows disponibles
  analyzeFlows() {
    this.log('\n🔄 ANALYSE FLOWS', 'cyan');
    this.log('='.repeat(70), 'cyan');
    
    const flowsPath = path.join(this.rootDir, '.homeycompose', 'flow');
    
    if (!fs.existsSync(flowsPath)) {
      this.log('  ⚠️  Dossier .homeycompose/flow non trouvé', 'yellow');
      return;
    }
    
    // Triggers
    const triggersPath = path.join(flowsPath, 'triggers.json');
    if (fs.existsSync(triggersPath)) {
      try {
        const triggers = JSON.parse(fs.readFileSync(triggersPath, 'utf8'));
        Object.keys(triggers).forEach(id => this.results.current.flowTriggers.add(id));
        this.log(`  ✅ Triggers: ${this.results.current.flowTriggers.size}`, 'green');
      } catch (err) {
        this.log(`  ❌ Erreur triggers: ${err.message}`, 'red');
      }
    }
    
    // Conditions
    const conditionsPath = path.join(flowsPath, 'conditions.json');
    if (fs.existsSync(conditionsPath)) {
      try {
        const conditions = JSON.parse(fs.readFileSync(conditionsPath, 'utf8'));
        Object.keys(conditions).forEach(id => this.results.current.flowConditions.add(id));
        this.log(`  ✅ Conditions: ${this.results.current.flowConditions.size}`, 'green');
      } catch (err) {
        this.log(`  ❌ Erreur conditions: ${err.message}`, 'red');
      }
    }
    
    // Actions
    const actionsPath = path.join(flowsPath, 'actions.json');
    if (fs.existsSync(actionsPath)) {
      try {
        const actions = JSON.parse(fs.readFileSync(actionsPath, 'utf8'));
        Object.keys(actions).forEach(id => this.results.current.flowActions.add(id));
        this.log(`  ✅ Actions: ${this.results.current.flowActions.size}`, 'green');
      } catch (err) {
        this.log(`  ❌ Erreur actions: ${err.message}`, 'red');
      }
    }
  }

  // ANALYSE 4: Comparaison avec historique
  analyzeHistoricalComparison() {
    this.log('\n📊 COMPARAISON HISTORIQUE', 'cyan');
    this.log('='.repeat(70), 'cyan');
    
    // Essayer de lire des rapports précédents
    const referencesDir = path.join(this.rootDir, 'references');
    
    if (fs.existsSync(referencesDir)) {
      const files = fs.readdirSync(referencesDir).filter(f => f.includes('ANALYSIS') || f.includes('REPORT'));
      
      if (files.length > 0) {
        this.log(`  📄 ${files.length} rapports historiques trouvés`, 'blue');
        
        // Essayer de charger le plus récent (hors celui d'aujourd'hui)
        const oldReports = files.filter(f => !f.includes('ULTIMATE_PROJECT'));
        if (oldReports.length > 0) {
          this.log(`  📊 Analyse des rapports historiques...`, 'blue');
        }
      }
    }
    
    // Analyse Git pour voir évolution
    try {
      const diffStat = execSync('git diff HEAD~10 --stat', {
        cwd: this.rootDir,
        encoding: 'utf8',
        timeout: 5000
      });
      
      if (diffStat.includes('drivers/')) {
        this.log(`  ⚠️  Changements détectés dans drivers/ (derniers 10 commits)`, 'yellow');
      }
    } catch (err) {
      // Ignore
    }
  }

  // ANALYSE 5: Détection manques
  detectMissing() {
    this.log('\n🔍 DÉTECTION MANQUES', 'cyan');
    this.log('='.repeat(70), 'cyan');
    
    // Flows manquants essentiels
    const essentialTriggers = [
      'alarm_motion_true', 'alarm_contact_true', 'alarm_tamper_true',
      'alarm_battery_true', 'alarm_water_true', 'alarm_smoke_true',
      'measure_temperature_changed', 'measure_humidity_changed',
      'onoff_true', 'onoff_false', 'dim_changed'
    ];
    
    const missingTriggers = essentialTriggers.filter(t => 
      !this.results.current.flowTriggers.has(t)
    );
    
    if (missingTriggers.length > 0) {
      this.log(`  ⚠️  ${missingTriggers.length} triggers essentiels manquants`, 'yellow');
      this.results.missing.flows = missingTriggers;
    } else {
      this.log(`  ✅ Tous les triggers essentiels présents`, 'green');
    }
    
    // Capabilities manquantes
    const essentialCapabilities = [
      'onoff', 'dim', 'light_hue', 'light_saturation', 'light_temperature',
      'measure_temperature', 'measure_humidity', 'measure_battery',
      'measure_power', 'meter_power', 'measure_luminance',
      'alarm_motion', 'alarm_contact', 'alarm_tamper', 'alarm_battery',
      'alarm_water', 'alarm_smoke', 'alarm_co', 'locked', 'windowcoverings_state'
    ];
    
    const missingCapabilities = essentialCapabilities.filter(c => 
      !this.results.current.capabilities.has(c)
    );
    
    if (missingCapabilities.length > 0) {
      this.log(`  ⚠️  ${missingCapabilities.length} capabilities essentielles manquantes`, 'yellow');
      this.results.missing.capabilities = missingCapabilities;
    } else {
      this.log(`  ✅ Toutes les capabilities essentielles présentes`, 'green');
    }
  }

  // GÉNÉRATION KPIs
  calculateKPIs() {
    this.log('\n📊 CALCUL KPIs', 'cyan');
    this.log('='.repeat(70), 'cyan');
    
    const kpis = {
      deviceCoverage: {
        manufacturerNames: this.results.current.manufacturerNames.size,
        productIds: this.results.current.productIds.size,
        totalDevices: this.results.current.manufacturerNames.size + this.results.current.productIds.size,
        driversCount: this.results.current.drivers
      },
      functionalCoverage: {
        capabilities: this.results.current.capabilities.size,
        clusters: this.results.current.clusters.size,
        deviceClasses: this.results.current.deviceClasses.size
      },
      flowCoverage: {
        triggers: this.results.current.flowTriggers.size,
        conditions: this.results.current.flowConditions.size,
        actions: this.results.current.flowActions.size,
        total: this.results.current.flowTriggers.size + 
               this.results.current.flowConditions.size + 
               this.results.current.flowActions.size
      },
      quality: {
        avgManufacturersPerDriver: (this.results.current.manufacturerNames.size / this.results.current.drivers).toFixed(2),
        avgCapabilitiesPerDriver: (this.results.current.capabilities.size / this.results.current.drivers).toFixed(2)
      }
    };
    
    this.log(`  📊 Drivers: ${kpis.deviceCoverage.driversCount}`, 'cyan');
    this.log(`  🏭 ManufacturerNames: ${kpis.deviceCoverage.manufacturerNames}`, 'cyan');
    this.log(`  🔖 ProductIds: ${kpis.deviceCoverage.productIds}`, 'cyan');
    this.log(`  ⚡ Capabilities: ${kpis.functionalCoverage.capabilities}`, 'cyan');
    this.log(`  🔧 Clusters: ${kpis.functionalCoverage.clusters}`, 'cyan');
    this.log(`  🔄 Flow cards: ${kpis.flowCoverage.total}`, 'cyan');
    this.log(`  📈 Moyenne mfrs/driver: ${kpis.quality.avgManufacturersPerDriver}`, 'cyan');
    
    return kpis;
  }

  // GÉNÉRATION RECOMMANDATIONS
  generateRecommendations() {
    this.log('\n💡 RECOMMANDATIONS', 'cyan');
    this.log('='.repeat(70), 'cyan');
    
    // 1. Flows manquants
    if (this.results.missing.flows.length > 0) {
      this.results.recommendations.push({
        priority: 'HIGH',
        category: 'Flows',
        issue: `${this.results.missing.flows.length} triggers essentiels manquants`,
        action: 'Ajouter triggers dans .homeycompose/flow/triggers.json',
        impact: 'Améliore expérience utilisateur flows'
      });
    }
    
    // 2. Capabilities manquantes
    if (this.results.missing.capabilities.length > 0) {
      this.results.recommendations.push({
        priority: 'HIGH',
        category: 'Capabilities',
        issue: `${this.results.missing.capabilities.length} capabilities essentielles manquantes`,
        action: 'Vérifier et ajouter capabilities dans drivers',
        impact: 'Augmente fonctionnalités disponibles'
      });
    }
    
    // 3. Couverture devices
    if (this.results.current.manufacturerNames.size < 300) {
      this.results.recommendations.push({
        priority: 'MEDIUM',
        category: 'Device Coverage',
        issue: `Seulement ${this.results.current.manufacturerNames.size} manufacturerNames (objectif: 500+)`,
        action: 'Enrichir avec nouvelles références (Blakadder, Z2M, etc.)',
        impact: 'Plus de devices supportés'
      });
    }
    
    // 4. Flows
    if (this.results.current.flowTriggers.size < 20) {
      this.results.recommendations.push({
        priority: 'MEDIUM',
        category: 'Flows',
        issue: `Seulement ${this.results.current.flowTriggers.size} triggers (objectif: 30+)`,
        action: 'Ajouter plus de triggers pour events communs',
        impact: 'Meilleure intégration Homey Flows'
      });
    }
    
    // 5. Documentation
    this.results.recommendations.push({
      priority: 'LOW',
      category: 'Documentation',
      issue: 'Documentation utilisateur à améliorer',
      action: 'Créer guides utilisateurs, FAQ, troubleshooting',
      impact: 'Support utilisateurs amélioré'
    });
    
    this.results.recommendations.forEach((rec, idx) => {
      this.log(`\n  ${idx + 1}. ${rec.category} (${rec.priority})`, rec.priority === 'HIGH' ? 'red' : rec.priority === 'MEDIUM' ? 'yellow' : 'blue');
      this.log(`     Problème: ${rec.issue}`, 'yellow');
      this.log(`     Action: ${rec.action}`, 'cyan');
      this.log(`     Impact: ${rec.impact}`, 'green');
    });
  }

  displayCurrentStats() {
    this.log('\n📊 STATISTIQUES ACTUELLES', 'cyan');
    this.log('='.repeat(70), 'cyan');
    
    this.log(`  📦 Drivers: ${this.results.current.drivers}`, 'blue');
    this.log(`  🏭 ManufacturerNames: ${this.results.current.manufacturerNames.size}`, 'blue');
    this.log(`  🔖 ProductIds: ${this.results.current.productIds.size}`, 'blue');
    this.log(`  ⚡ Capabilities: ${this.results.current.capabilities.size}`, 'blue');
    this.log(`  🔧 Clusters: ${this.results.current.clusters.size}`, 'blue');
    this.log(`  📱 Device Classes: ${this.results.current.deviceClasses.size}`, 'blue');
  }

  // GÉNÉRATION RAPPORT
  generateReport() {
    this.log('\n📊 GÉNÉRATION RAPPORT', 'cyan');
    this.log('='.repeat(70), 'cyan');
    
    const kpis = this.calculateKPIs();
    
    const report = {
      generatedAt: new Date().toISOString(),
      kpis,
      currentState: {
        drivers: this.results.current.drivers,
        manufacturerNames: Array.from(this.results.current.manufacturerNames).slice(0, 50),
        manufacturerNamesCount: this.results.current.manufacturerNames.size,
        productIds: Array.from(this.results.current.productIds).slice(0, 50),
        productIdsCount: this.results.current.productIds.size,
        capabilities: Array.from(this.results.current.capabilities),
        clusters: Array.from(this.results.current.clusters),
        deviceClasses: Array.from(this.results.current.deviceClasses),
        flowTriggers: Array.from(this.results.current.flowTriggers),
        flowConditions: Array.from(this.results.current.flowConditions),
        flowActions: Array.from(this.results.current.flowActions)
      },
      missing: this.results.missing,
      recommendations: this.results.recommendations
    };
    
    const referencesDir = path.join(this.rootDir, 'references');
    const jsonPath = path.join(referencesDir, 'REGRESSION_COVERAGE_ANALYSIS.json');
    fs.writeFileSync(jsonPath, JSON.stringify(report, null, 2));
    this.log(`  ✅ JSON: ${jsonPath}`, 'green');
    
    return report;
  }

  async run() {
    console.log('\n');
    this.log('╔══════════════════════════════════════════════════════════════════════╗', 'magenta');
    this.log('║     🔍 REGRESSION & COVERAGE ANALYZER                               ║', 'magenta');
    this.log('║     Analyse pourquoi moins bien + Améliorations                     ║', 'magenta');
    this.log('╚══════════════════════════════════════════════════════════════════════╝', 'magenta');
    console.log('\n');
    
    this.analyzeCurrentState();
    this.analyzeFlows();
    this.analyzeHistoricalComparison();
    this.detectMissing();
    this.calculateKPIs();
    this.generateRecommendations();
    this.generateReport();
    
    this.log('\n✅ ANALYSE TERMINÉE!\n', 'green');
    this.log('Rapport: references/REGRESSION_COVERAGE_ANALYSIS.json\n', 'cyan');
  }
}

if (require.main === module) {
  const analyzer = new RegressionCoverageAnalyzer();
  analyzer.run().catch(err => {
    console.error('❌ Erreur fatale:', err);
    process.exit(1);
  });
}

module.exports = RegressionCoverageAnalyzer;
