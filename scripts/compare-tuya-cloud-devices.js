#!/usr/bin/env node
/**
 * 🔍 COMPARAISON DEVICES TUYA CLOUD vs UNIVERSAL TUYA ZIGBEE
 * 
 * Compare les devices supportés par Tuya Cloud app avec notre app Zigbee
 * pour identifier les types de devices manquants
 * 
 * NOTE IMPORTANTE:
 * - Tuya Cloud = WiFi/Cloud devices
 * - Universal Tuya Zigbee = Zigbee devices SEULEMENT (local)
 * - Nous cherchons les équivalents Zigbee des catégories Cloud
 */

const fs = require('fs');
const path = require('path');

const COLORS = {
  reset: '\x1b[0m', red: '\x1b[31m', green: '\x1b[32m',
  yellow: '\x1b[33m', blue: '\x1b[34m', magenta: '\x1b[35m', cyan: '\x1b[36m'
};

class TuyaCloudComparer {
  constructor() {
    this.rootDir = path.resolve(__dirname, '..');
    this.driversDir = path.join(this.rootDir, 'drivers');
    
    // Liste des devices supportés par Tuya Cloud (source: community forum)
    this.tuyaCloudDevices = {
      actuators: [
        { category: 'Light', variants: ['bulb', 'strip', 'spot'] },
        { category: 'Switch', variants: ['1gang', '2gang', '3gang', '4gang', 'wall', 'touch'] },
        { category: 'Socket', variants: ['plug', 'outlet', 'usb'] },
        { category: 'Dehumidifier', variants: [] },
        { category: 'Air conditioner', variants: [] },
        { category: 'Thermostat', variants: ['heating', 'radiator'] },
        { category: 'Garage Door Opener', variants: [] },
        { category: 'Window coverings', variants: ['blinds', 'curtains', 'shutter', 'roller'] },
        { category: 'Heater', variants: [] }
      ],
      sensors: [
        { category: 'Presence', variants: ['radar', 'mmwave', 'pir'] },
        { category: 'Motion', variants: ['pir', 'radar'] },
        { category: 'Contact', variants: ['door', 'window'] },
        { category: 'Smoke', variants: ['detector'] },
        { category: 'CO', variants: ['detector'] },
        { category: 'Flood', variants: ['water', 'leak'] }
      ]
    };
    
    this.results = {
      covered: [],
      missing: [],
      ourDrivers: []
    };
  }

  log(msg, color = 'reset') {
    console.log(`${COLORS[color]}${msg}${COLORS.reset}`);
  }

  // Récupérer tous nos drivers
  getOurDrivers() {
    this.log('\n📊 ANALYSE NOS DRIVERS', 'cyan');
    this.log('='.repeat(70), 'cyan');
    
    const drivers = fs.readdirSync(this.driversDir).filter(item => {
      const driverPath = path.join(this.driversDir, item);
      return fs.statSync(driverPath).isDirectory();
    });
    
    this.results.ourDrivers = drivers;
    this.log(`  ✅ ${drivers.length} drivers trouvés`, 'green');
    
    return drivers;
  }

  // Vérifier couverture par catégorie
  checkCoverage() {
    this.log('\n🔍 VÉRIFICATION COUVERTURE', 'cyan');
    this.log('='.repeat(70), 'cyan');
    
    const drivers = this.results.ourDrivers;
    
    // ACTUATORS
    this.log('\n📡 ACTUATORS:', 'yellow');
    this.tuyaCloudDevices.actuators.forEach(device => {
      const keywords = [
        device.category.toLowerCase().replace(/\s+/g, '_'),
        ...device.variants
      ];
      
      const hasDrivers = drivers.filter(d => 
        keywords.some(k => d.toLowerCase().includes(k))
      );
      
      if (hasDrivers.length > 0) {
        this.log(`  ✅ ${device.category}: ${hasDrivers.length} drivers`, 'green');
        this.results.covered.push({
          category: device.category,
          count: hasDrivers.length,
          drivers: hasDrivers
        });
      } else {
        this.log(`  ❌ ${device.category}: MANQUANT`, 'red');
        this.results.missing.push({
          category: device.category,
          type: 'actuator'
        });
      }
    });
    
    // SENSORS
    this.log('\n📡 SENSORS:', 'yellow');
    this.tuyaCloudDevices.sensors.forEach(device => {
      const keywords = [
        device.category.toLowerCase(),
        ...device.variants,
        'sensor'
      ];
      
      const hasDrivers = drivers.filter(d => 
        keywords.some(k => d.toLowerCase().includes(k))
      );
      
      if (hasDrivers.length > 0) {
        this.log(`  ✅ ${device.category}: ${hasDrivers.length} drivers`, 'green');
        this.results.covered.push({
          category: device.category,
          count: hasDrivers.length,
          drivers: hasDrivers
        });
      } else {
        this.log(`  ❌ ${device.category}: MANQUANT`, 'red');
        this.results.missing.push({
          category: device.category,
          type: 'sensor'
        });
      }
    });
  }

  // Recommandations
  generateRecommendations() {
    this.log('\n💡 RECOMMANDATIONS', 'cyan');
    this.log('='.repeat(70), 'cyan');
    
    if (this.results.missing.length === 0) {
      this.log('  ✅ EXCELLENTE COUVERTURE!', 'green');
      this.log('  Nous couvrons toutes les catégories Tuya Cloud en Zigbee', 'green');
      return;
    }
    
    this.log(`  ⚠️  ${this.results.missing.length} catégories manquantes:`, 'yellow');
    
    this.results.missing.forEach((item, idx) => {
      this.log(`\n  ${idx + 1}. ${item.category} (${item.type})`, 'yellow');
      
      // Suggestions basées sur la catégorie
      if (item.category === 'Dehumidifier') {
        this.log('     💡 Suggestion: Ajouter driver dehumidifier_hybrid', 'cyan');
        this.log('     - Tuya fait des dehumidifiers Zigbee', 'cyan');
        this.log('     - Capabilities: target_humidity, measure_humidity', 'cyan');
      } else if (item.category === 'Air conditioner') {
        this.log('     💡 Suggestion: Ajouter driver air_conditioner_hybrid', 'cyan');
        this.log('     - Tuya fait des AC Zigbee', 'cyan');
        this.log('     - Capabilities: target_temperature, thermostat_mode, fan_speed', 'cyan');
      } else if (item.category === 'Garage Door Opener') {
        this.log('     💡 Suggestion: Ajouter driver garage_door_opener_hybrid', 'cyan');
        this.log('     - Tuya fait des garage door openers Zigbee', 'cyan');
        this.log('     - Capabilities: windowcoverings_state, locked', 'cyan');
      } else if (item.category === 'Heater') {
        this.log('     ℹ️  Note: Nous avons déjà des thermostats/radiator valves', 'blue');
        this.log('     - Vérifier si heater générique nécessaire', 'blue');
      } else if (item.category === 'CO') {
        this.log('     💡 Suggestion: Ajouter driver co_detector_battery', 'cyan');
        this.log('     - Tuya fait des CO detectors Zigbee', 'cyan');
        this.log('     - Capabilities: alarm_co, measure_co, alarm_battery', 'cyan');
      }
    });
  }

  // Rapport détaillé
  generateReport() {
    this.log('\n📊 RAPPORT COMPLET', 'cyan');
    this.log('='.repeat(70), 'cyan');
    
    const report = {
      generatedAt: new Date().toISOString(),
      tuyaCloudDevices: {
        actuators: this.tuyaCloudDevices.actuators.length,
        sensors: this.tuyaCloudDevices.sensors.length,
        total: this.tuyaCloudDevices.actuators.length + this.tuyaCloudDevices.sensors.length
      },
      ourApp: {
        totalDrivers: this.results.ourDrivers.length,
        covered: this.results.covered.length,
        missing: this.results.missing.length,
        coveragePercentage: Math.round(
          (this.results.covered.length / 
          (this.tuyaCloudDevices.actuators.length + this.tuyaCloudDevices.sensors.length)) * 100
        )
      },
      details: {
        covered: this.results.covered,
        missing: this.results.missing
      }
    };
    
    this.log(`\n  📈 Couverture: ${report.ourApp.coveragePercentage}%`, 'cyan');
    this.log(`  ✅ Catégories couvertes: ${report.ourApp.covered}/${report.tuyaCloudDevices.total}`, 'green');
    this.log(`  ❌ Catégories manquantes: ${report.ourApp.missing}`, 'yellow');
    
    const jsonPath = path.join(this.rootDir, 'references', 'TUYA_CLOUD_COMPARISON.json');
    fs.writeFileSync(jsonPath, JSON.stringify(report, null, 2));
    this.log(`\n  ✅ Rapport: ${jsonPath}`, 'green');
    
    return report;
  }

  async run() {
    console.log('\n');
    this.log('╔══════════════════════════════════════════════════════════════════════╗', 'magenta');
    this.log('║     🔍 COMPARAISON TUYA CLOUD vs UNIVERSAL TUYA ZIGBEE             ║', 'magenta');
    this.log('╚══════════════════════════════════════════════════════════════════════╝', 'magenta');
    console.log('\n');
    
    this.getOurDrivers();
    this.checkCoverage();
    this.generateRecommendations();
    const report = this.generateReport();
    
    this.log('\n✅ ANALYSE TERMINÉE!\n', 'green');
    
    if (report.ourApp.coveragePercentage >= 90) {
      this.log('🎉 EXCELLENTE COUVERTURE! Nous avons presque tout!', 'green');
    } else if (report.ourApp.coveragePercentage >= 75) {
      this.log('👍 BONNE COUVERTURE! Quelques ajouts possibles.', 'yellow');
    } else {
      this.log('⚠️  COUVERTURE MOYENNE. Plusieurs catégories à ajouter.', 'red');
    }
  }
}

if (require.main === module) {
  const comparer = new TuyaCloudComparer();
  comparer.run().catch(err => {
    console.error('❌ Erreur fatale:', err);
    process.exit(1);
  });
}

module.exports = TuyaCloudComparer;
