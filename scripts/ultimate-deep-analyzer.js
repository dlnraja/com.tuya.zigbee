#!/usr/bin/env node
/**
 * 🔬 ULTIMATE DEEP ANALYZER
 * 
 * Analyse approfondie basée sur:
 * 1. Anciennes versions v2.15 (quand ça fonctionnait parfaitement)
 * 2. SDK3 Homey officiel
 * 3. Autres projets Homey (Philips, Xiaomi, Tuya référence)
 * 4. Clusters Zigbee standards
 * 
 * Identifie:
 * - Ce qui a été perdu (lux, data, capabilities)
 * - Pourquoi moins de couverture
 * - Comment restaurer les fonctionnalités
 * - Améliorations nécessaires
 * 
 * IMPORTANT: Pas de .homeycompose/ (régénéré par GitHub Actions)
 * Tout doit être dans app.json directement
 */

const fs = require('fs');
const path = require('path');

const COLORS = {
  reset: '\x1b[0m', red: '\x1b[31m', green: '\x1b[32m',
  yellow: '\x1b[33m', blue: '\x1b[34m', magenta: '\x1b[35m', cyan: '\x1b[36m'
};

class UltimateDeepAnalyzer {
  constructor() {
    this.rootDir = path.resolve(__dirname, '..');
    this.results = {
      v215Analysis: {
        features: [],
        clusters: [],
        capabilities: [],
        flows: []
      },
      currentState: {
        features: [],
        clusters: [],
        capabilities: [],
        flows: []
      },
      missing: {
        features: [],
        clusters: [],
        capabilities: [],
        flows: []
      },
      recommendations: [],
      improvements: []
    };
    
    // Clusters Zigbee standards (d'après SDK3 + autres projets)
    this.standardClusters = {
      // Basic clusters
      0: 'genBasic',
      1: 'genPowerCfg',
      3: 'genIdentify',
      4: 'genGroups',
      5: 'genScenes',
      6: 'genOnOff',
      8: 'genLevelCtrl',
      
      // Measurement clusters
      1024: 'msIlluminanceMeasurement',
      1026: 'msTemperatureMeasurement',
      1027: 'msPressureMeasurement',
      1028: 'msFlowMeasurement',
      1029: 'msRelativeHumidity',
      1030: 'msOccupancySensing',
      
      // Lighting clusters
      768: 'lightingColorCtrl',
      
      // HVAC clusters
      513: 'hvacThermostat',
      516: 'hvacFanCtrl',
      
      // Closures
      256: 'closuresWindowCovering',
      257: 'closuresDoorLock',
      
      // Security & Safety
      1280: 'ssIasZone',
      1281: 'ssIasAce',
      1282: 'ssIasWd',
      
      // Smart Energy
      1794: 'seMetering',
      2820: 'haElectricalMeasurement',
      
      // Tuya specific
      61184: 'manuSpecificTuya'
    };
    
    // Capabilities standards (d'après SDK3)
    this.standardCapabilities = [
      // Sensors
      'measure_temperature', 'measure_humidity', 'measure_pressure',
      'measure_co', 'measure_co2', 'measure_pm25', 'measure_luminance',
      'measure_noise', 'measure_voltage', 'measure_current',
      'measure_power', 'measure_battery', 'measure_gust_strength',
      'measure_wind_strength', 'measure_rain', 'measure_ultraviolet',
      
      // Meters
      'meter_power', 'meter_water', 'meter_gas', 'meter_rain',
      
      // Alarms
      'alarm_motion', 'alarm_contact', 'alarm_vibration', 'alarm_tamper',
      'alarm_smoke', 'alarm_fire', 'alarm_co', 'alarm_co2',
      'alarm_water', 'alarm_heat', 'alarm_battery', 'alarm_generic',
      
      // Controls
      'onoff', 'dim', 'light_hue', 'light_saturation', 'light_temperature',
      'light_mode', 'volume_set', 'volume_mute', 'volume_up', 'volume_down',
      'channel_up', 'channel_down',
      
      // HVAC
      'target_temperature', 'thermostat_mode', 'fan_speed',
      
      // Covers
      'windowcoverings_state', 'windowcoverings_set',
      
      // Security
      'locked', 'lock_mode', 'homealarm_state',
      
      // Buttons
      'button'
    ];
  }

  log(msg, color = 'reset') {
    console.log(`${COLORS[color]}${msg}${COLORS.reset}`);
  }

  // ANALYSE 1: Anciens rapports v2.15
  analyzeV215Reports() {
    this.log('\n📊 ANALYSE RAPPORTS v2.15 (VERSIONS FONCTIONNELLES)', 'cyan');
    this.log('='.repeat(70), 'cyan');
    
    const reportsDir = path.join(this.rootDir, 'reports');
    const v215Files = fs.readdirSync(reportsDir)
      .filter(f => f.includes('v2.15'))
      .slice(0, 10); // Analyser les 10 premiers
    
    this.log(`  📄 ${v215Files.length} fichiers v2.15 trouvés`, 'blue');
    
    let featuresFound = new Set();
    let clustersFound = new Set();
    
    for (const file of v215Files) {
      try {
        const content = fs.readFileSync(path.join(reportsDir, file), 'utf8');
        
        // Chercher mentions de features
        if (content.includes('measure_luminance') || content.includes('lux')) {
          featuresFound.add('measure_luminance');
        }
        if (content.includes('illuminance') || content.includes('Illuminance')) {
          clustersFound.add(1024); // msIlluminanceMeasurement
        }
        if (content.includes('temperature')) {
          featuresFound.add('measure_temperature');
          clustersFound.add(1026);
        }
        if (content.includes('humidity')) {
          featuresFound.add('measure_humidity');
          clustersFound.add(1029);
        }
        if (content.includes('pressure')) {
          featuresFound.add('measure_pressure');
          clustersFound.add(1027);
        }
        if (content.includes('occupancy')) {
          clustersFound.add(1030);
        }
        
      } catch (err) {
        // Ignorer erreurs
      }
    }
    
    this.results.v215Analysis.features = Array.from(featuresFound);
    this.results.v215Analysis.clusters = Array.from(clustersFound);
    
    this.log(`  ✅ Features v2.15: ${this.results.v215Analysis.features.length}`, 'green');
    this.log(`  ✅ Clusters v2.15: ${this.results.v215Analysis.clusters.length}`, 'green');
    
    if (featuresFound.has('measure_luminance')) {
      this.log(`  🌟 v2.15 avait: measure_luminance (LUX)`, 'yellow');
    }
  }

  // ANALYSE 2: État actuel
  analyzeCurrentState() {
    this.log('\n📊 ANALYSE ÉTAT ACTUEL', 'cyan');
    this.log('='.repeat(70), 'cyan');
    
    const driversDir = path.join(this.rootDir, 'drivers');
    const drivers = fs.readdirSync(driversDir).filter(item => {
      const driverPath = path.join(driversDir, item);
      return fs.statSync(driverPath).isDirectory();
    });
    
    let capabilitiesFound = new Set();
    let clustersFound = new Set();
    
    for (const driverId of drivers) {
      const composePath = path.join(driversDir, driverId, 'driver.compose.json');
      if (!fs.existsSync(composePath)) continue;
      
      try {
        const data = JSON.parse(fs.readFileSync(composePath, 'utf8'));
        
        // Capabilities
        if (data.capabilities) {
          data.capabilities.forEach(cap => {
            if (typeof cap === 'string') {
              capabilitiesFound.add(cap);
            } else if (cap.id) {
              capabilitiesFound.add(cap.id);
            }
          });
        }
        
        // Clusters
        if (data.zigbee?.endpoints) {
          Object.values(data.zigbee.endpoints).forEach(endpoint => {
            if (endpoint.clusters) {
              endpoint.clusters.forEach(cluster => {
                if (typeof cluster === 'number' || typeof cluster === 'string') {
                  clustersFound.add(cluster);
                }
              });
            }
          });
        }
        
      } catch (err) {
        // Ignorer
      }
    }
    
    this.results.currentState.capabilities = Array.from(capabilitiesFound);
    this.results.currentState.clusters = Array.from(clustersFound);
    
    this.log(`  📊 Drivers actuels: ${drivers.length}`, 'blue');
    this.log(`  ⚡ Capabilities actuelles: ${this.results.currentState.capabilities.length}`, 'blue');
    this.log(`  🔧 Clusters actuels: ${this.results.currentState.clusters.length}`, 'blue');
    
    // Vérifier si measure_luminance présent
    if (!capabilitiesFound.has('measure_luminance')) {
      this.log(`  ❌ MANQUE: measure_luminance (LUX)`, 'red');
      this.results.missing.capabilities.push('measure_luminance');
    }
    
    // Vérifier clusters illuminance
    if (!Array.from(clustersFound).some(c => c === 1024 || c === 'msIlluminanceMeasurement')) {
      this.log(`  ❌ MANQUE: Cluster 1024 (Illuminance)`, 'red');
      this.results.missing.clusters.push(1024);
    }
  }

  // ANALYSE 3: Comparaison avec standards
  compareWithStandards() {
    this.log('\n📊 COMPARAISON AVEC STANDARDS SDK3', 'cyan');
    this.log('='.repeat(70), 'cyan');
    
    // Capabilities manquantes
    const missingCaps = this.standardCapabilities.filter(cap => 
      !this.results.currentState.capabilities.includes(cap)
    );
    
    if (missingCaps.length > 0) {
      this.log(`  ⚠️  ${missingCaps.length} capabilities standards manquantes`, 'yellow');
      this.results.missing.capabilities.push(...missingCaps.slice(0, 10)); // Top 10
    }
    
    // Clusters manquants essentiels
    const essentialClusters = [1024, 1026, 1027, 1029, 1030, 1280];
    const missingClusters = essentialClusters.filter(cluster => {
      return !this.results.currentState.clusters.some(c => 
        c === cluster || c === this.standardClusters[cluster]
      );
    });
    
    if (missingClusters.length > 0) {
      this.log(`  ⚠️  ${missingClusters.length} clusters essentiels manquants`, 'yellow');
      missingClusters.forEach(cluster => {
        this.log(`     - ${cluster} (${this.standardClusters[cluster]})`, 'yellow');
      });
    }
  }

  // RECOMMANDATIONS
  generateRecommendations() {
    this.log('\n💡 RECOMMANDATIONS POUR RESTAURER FONCTIONNALITÉS', 'cyan');
    this.log('='.repeat(70), 'cyan');
    
    // 1. Restaurer measure_luminance
    if (this.results.missing.capabilities.includes('measure_luminance')) {
      this.results.recommendations.push({
        priority: 'CRITICAL',
        category: 'Capabilities',
        issue: 'measure_luminance (LUX) manquant',
        solution: 'Ajouter dans drivers multi-sensors',
        implementation: `
// Dans device.js des multi-sensors:
this.registerCapability('measure_luminance', 1024, {
  get: 'measuredValue',
  reportParser: value => value,
  report: 'measuredValue',
  getOpts: {
    getOnStart: true
  }
});`
      });
      
      this.log('  🔴 CRITIQUE: Restaurer measure_luminance', 'red');
    }
    
    // 2. Ajouter flows dans app.json
    this.results.recommendations.push({
      priority: 'HIGH',
      category: 'Flows',
      issue: 'Flows manquants (pas de .homeycompose)',
      solution: 'Ajouter flows directement dans app.json',
      implementation: `
// Dans app.json, ajouter section "flow":
"flow": {
  "triggers": [
    {
      "id": "measure_temperature_changed",
      "title": { "en": "Temperature changed" },
      "tokens": [
        {
          "name": "temperature",
          "type": "number",
          "title": { "en": "Temperature" }
        }
      ],
      "args": [
        {
          "name": "device",
          "type": "device",
          "filter": "capabilities=measure_temperature"
        }
      ]
    }
  ],
  "actions": [
    {
      "id": "turn_on",
      "title": { "en": "Turn on" },
      "args": [
        {
          "name": "device",
          "type": "device",
          "filter": "capabilities=onoff"
        }
      ]
    }
  ]
}`
    });
    
    this.log('  🟠 HIGH: Ajouter flows dans app.json', 'yellow');
    
    // 3. Améliorer couverture
    this.results.recommendations.push({
      priority: 'MEDIUM',
      category: 'Coverage',
      issue: 'Couverture appareils réduite',
      solution: 'Enrichir manufacturerNames + productIds',
      implementation: 'Utiliser scripts d\'enrichissement existants'
    });
    
    this.log('  🟡 MEDIUM: Enrichir couverture devices', 'yellow');
  }

  // GÉNÉRATION RAPPORT
  generateReport() {
    this.log('\n📊 GÉNÉRATION RAPPORT ULTRA-DÉTAILLÉ', 'cyan');
    this.log('='.repeat(70), 'cyan');
    
    const report = {
      generatedAt: new Date().toISOString(),
      analysis: {
        v215: this.results.v215Analysis,
        current: this.results.currentState,
        missing: this.results.missing
      },
      recommendations: this.results.recommendations,
      improvements: this.generateImprovements()
    };
    
    const referencesDir = path.join(this.rootDir, 'references');
    const jsonPath = path.join(referencesDir, 'ULTIMATE_DEEP_ANALYSIS.json');
    fs.writeFileSync(jsonPath, JSON.stringify(report, null, 2));
    this.log(`  ✅ JSON: ${jsonPath}`, 'green');
    
    return report;
  }

  generateImprovements() {
    return [
      {
        type: 'ADD_CAPABILITY',
        target: 'multi-sensors',
        capability: 'measure_luminance',
        cluster: 1024,
        priority: 'CRITICAL'
      },
      {
        type: 'ADD_FLOWS',
        target: 'app.json',
        flowTypes: ['triggers', 'conditions', 'actions'],
        priority: 'HIGH'
      },
      {
        type: 'ENRICH_COVERAGE',
        target: 'all-drivers',
        method: 'scraping',
        priority: 'MEDIUM'
      }
    ];
  }

  async run() {
    console.log('\n');
    this.log('╔══════════════════════════════════════════════════════════════════════╗', 'magenta');
    this.log('║     🔬 ULTIMATE DEEP ANALYZER                                       ║', 'magenta');
    this.log('║     v2.15 + SDK3 + Autres Projets + Standards                       ║', 'magenta');
    this.log('╚══════════════════════════════════════════════════════════════════════╝', 'magenta');
    console.log('\n');
    
    this.analyzeV215Reports();
    this.analyzeCurrentState();
    this.compareWithStandards();
    this.generateRecommendations();
    this.generateReport();
    
    this.log('\n✅ ANALYSE APPROFONDIE TERMINÉE!\n', 'green');
    this.log('📄 Rapport: references/ULTIMATE_DEEP_ANALYSIS.json\n', 'cyan');
    
    this.log('🎯 ACTIONS PRIORITAIRES:', 'cyan');
    this.results.recommendations.forEach((rec, idx) => {
      const color = rec.priority === 'CRITICAL' ? 'red' : rec.priority === 'HIGH' ? 'yellow' : 'blue';
      this.log(`  ${idx + 1}. [${rec.priority}] ${rec.issue}`, color);
    });
  }
}

if (require.main === module) {
  const analyzer = new UltimateDeepAnalyzer();
  analyzer.run().catch(err => {
    console.error('❌ Erreur fatale:', err);
    process.exit(1);
  });
}

module.exports = UltimateDeepAnalyzer;
