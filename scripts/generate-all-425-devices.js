#!/usr/bin/env node
/**
 * 🚀 GÉNÉRATEUR COMPLET - TOUS LES 425 DEVICES!
 * 
 * Génère ABSOLUMENT TOUS les drivers:
 * - Xiaomi/Aqara: 75 devices
 * - Sonoff: 40 devices
 * - Samsung: 50 devices
 * - Tuya expansion: 150 devices
 * - IKEA: 30 devices
 * - OSRAM: 15 devices
 * - Marques EU: 65 devices
 * 
 * TOTAL: 425 devices - AUCUN OUBLIÉ!
 */

const fs = require('fs');
const path = require('path');

const COLORS = {
  reset: '\x1b[0m', red: '\x1b[31m', green: '\x1b[32m',
  yellow: '\x1b[33m', blue: '\x1b[34m', magenta: '\x1b[35m', cyan: '\x1b[36m'
};

// BASE DE DONNÉES COMPLÈTE - TOUS LES 425 DEVICES
const ALL_DEVICES = require('./devices-database-complete.js');

class CompleteGenerator {
  constructor() {
    this.rootDir = path.resolve(__dirname, '..');
    this.driversDir = path.join(this.rootDir, 'drivers');
    this.stats = {
      created: 0,
      skipped: 0,
      errors: 0,
      byBrand: {}
    };
  }

  log(msg, color = 'reset') {
    console.log(`${COLORS[color]}${msg}${COLORS.reset}`);
  }

  toPascalCase(str) {
    return str.split('_').map(word => 
      word.charAt(0).toUpperCase() + word.slice(1)
    ).join('');
  }

  generateDriverCompose(device) {
    const compose = {
      id: device.id,
      name: device.name,
      class: device.class,
      capabilities: device.caps,
      platforms: ['local'],
      connectivity: ['zigbee'],
      images: {
        small: `{{driverAssetsPath}}/images/small.png`,
        large: `{{driverAssetsPath}}/images/large.png`,
        xlarge: `{{driverAssetsPath}}/images/xlarge.png`
      },
      zigbee: {
        manufacturerName: device.mfr || [],
        productId: device.productId || [],
        endpoints: {
          1: {
            clusters: device.clusters || [0, 1, 6],
            bindings: [6]
          }
        },
        learnmode: {
          image: `{{driverAssetsPath}}/learnmode.svg`,
          instruction: {
            en: device.pairing?.en || 'Follow device pairing instructions',
            fr: device.pairing?.fr || 'Suivre les instructions d\'appairage'
          }
        }
      }
    };

    if (device.energy) {
      compose.energy = device.energy;
    }

    return compose;
  }

  generateDeviceJS(device) {
    const caps = device.caps.map(cap => {
      const capMap = {
        'onoff': `this.registerCapability('onoff', CLUSTER.ON_OFF, { endpoint: 1 });`,
        'measure_battery': `this.registerCapability('measure_battery', CLUSTER.POWER_CONFIGURATION, {
      get: 'batteryPercentageRemaining',
      reportParser: value => value / 2
    });`,
        'alarm_motion': `this.registerCapability('alarm_motion', CLUSTER.IAS_ZONE, {
      zoneType: 'motion',
      zoneState: 'alarm_1'
    });`,
        'alarm_contact': `this.registerCapability('alarm_contact', CLUSTER.IAS_ZONE, {
      zoneType: 'contact',
      zoneState: 'alarm_1'
    });`,
        'alarm_water': `this.registerCapability('alarm_water', CLUSTER.IAS_ZONE, {
      zoneType: 'water_leak',
      zoneState: 'alarm_1'
    });`,
        'alarm_smoke': `this.registerCapability('alarm_smoke', CLUSTER.IAS_ZONE, {
      zoneType: 'fire',
      zoneState: 'alarm_1'
    });`,
        'measure_temperature': `this.registerCapability('measure_temperature', CLUSTER.TEMPERATURE_MEASUREMENT);`,
        'measure_humidity': `this.registerCapability('measure_humidity', CLUSTER.RELATIVE_HUMIDITY_MEASUREMENT);`,
        'measure_pressure': `this.registerCapability('measure_pressure', CLUSTER.PRESSURE_MEASUREMENT);`,
        'measure_luminance': `this.registerCapability('measure_luminance', CLUSTER.ILLUMINANCE_MEASUREMENT);`,
        'measure_power': `this.registerCapability('measure_power', CLUSTER.ELECTRICAL_MEASUREMENT);`,
        'meter_power': `this.registerCapability('meter_power', CLUSTER.METERING);`,
        'dim': `this.registerCapability('dim', CLUSTER.LEVEL_CONTROL);`,
        'light_hue': `this.registerCapability('light_hue', CLUSTER.COLOR_CONTROL);`,
        'light_saturation': `this.registerCapability('light_saturation', CLUSTER.COLOR_CONTROL);`,
        'light_temperature': `this.registerCapability('light_temperature', CLUSTER.COLOR_CONTROL);`,
      };
      return capMap[cap] || `    // ${cap} capability`;
    }).join('\n    ');

    return `'use strict';

const { ZigBeeDevice } = require('homey-zigbeedriver');
const { CLUSTER } = require('zigbee-clusters');

class ${this.toPascalCase(device.id)}Device extends ZigBeeDevice {
  
  async onNodeInit({ zclNode }) {
    this.printNode();
    
    ${caps}
    
    this.log('${device.name.en || device.name} initialized');
  }
  
}

module.exports = ${this.toPascalCase(device.id)}Device;
`;
  }

  async createDriver(device, brand) {
    const driverPath = path.join(this.driversDir, device.id);
    
    if (fs.existsSync(driverPath)) {
      this.stats.skipped++;
      return;
    }
    
    try {
      fs.mkdirSync(driverPath, { recursive: true });
      fs.mkdirSync(path.join(driverPath, 'assets', 'images'), { recursive: true });
      
      const composeContent = JSON.stringify(this.generateDriverCompose(device), null, 2);
      fs.writeFileSync(path.join(driverPath, 'driver.compose.json'), composeContent);
      
      const deviceContent = this.generateDeviceJS(device);
      fs.writeFileSync(path.join(driverPath, 'device.js'), deviceContent);
      
      this.stats.created++;
      this.stats.byBrand[brand] = (this.stats.byBrand[brand] || 0) + 1;
      
    } catch (err) {
      this.stats.errors++;
      this.log(`  ❌ ${device.id}: ${err.message}`, 'red');
    }
  }

  async generateBrand(brand, devices) {
    this.log(`\n🏷️  ${brand.toUpperCase()} (${devices.length} devices)`, 'cyan');
    
    let progress = 0;
    for (const device of devices) {
      await this.createDriver(device, brand);
      progress++;
      if (progress % 10 === 0) {
        this.log(`  Progress: ${progress}/${devices.length}...`, 'blue');
      }
    }
    
    this.log(`  ✅ ${brand}: ${this.stats.byBrand[brand] || 0} drivers created`, 'green');
  }

  async run() {
    console.log('\n');
    this.log('╔══════════════════════════════════════════════════════════════════════╗', 'magenta');
    this.log('║     🚀 GÉNÉRATION COMPLÈTE - TOUS LES 425 DEVICES!                 ║', 'magenta');
    this.log('║     Xiaomi • Sonoff • Samsung • Tuya • IKEA • OSRAM • EU           ║', 'magenta');
    this.log('╚══════════════════════════════════════════════════════════════════════╝', 'magenta');
    console.log('\n');
    
    const startTime = Date.now();
    
    // Charger base de données
    this.log('📊 Chargement base de données...', 'cyan');
    const db = ALL_DEVICES;
    
    // Générer par marque
    await this.generateBrand('XIAOMI/AQARA', db.xiaomi || []);
    await this.generateBrand('SONOFF', db.sonoff || []);
    await this.generateBrand('SAMSUNG', db.samsung || []);
    await this.generateBrand('TUYA_EXPANSION', db.tuya || []);
    await this.generateBrand('IKEA', db.ikea || []);
    await this.generateBrand('OSRAM', db.osram || []);
    await this.generateBrand('MARQUES_EU', db.eu || []);
    
    const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
    
    // Résumé final
    this.log('\n' + '═'.repeat(70), 'magenta');
    this.log('  📊 RÉSUMÉ GÉNÉRATION COMPLÈTE', 'magenta');
    this.log('═'.repeat(70), 'magenta');
    
    Object.entries(this.stats.byBrand).forEach(([brand, count]) => {
      this.log(`  ✅ ${brand}: ${count} drivers`, 'green');
    });
    
    this.log(`\n  ✅ Total créés: ${this.stats.created}`, 'green');
    this.log(`  ⏭️  Skippés: ${this.stats.skipped}`, 'yellow');
    this.log(`  ❌ Erreurs: ${this.stats.errors}`, this.stats.errors > 0 ? 'red' : 'green');
    this.log(`  ⏱️  Temps: ${elapsed}s`, 'cyan');
    
    this.log('\n✅ GÉNÉRATION COMPLÈTE TERMINÉE!\n', 'green');
    this.log(`🎉 ${this.stats.created} nouveaux drivers créés!`, 'magenta');
    this.log(`📦 Total drivers app: ${185 + this.stats.created}`, 'cyan');
  }
}

if (require.main === module) {
  const generator = new CompleteGenerator();
  generator.run().catch(err => {
    console.error('❌ Erreur fatale:', err);
    process.exit(1);
  });
}

module.exports = CompleteGenerator;
