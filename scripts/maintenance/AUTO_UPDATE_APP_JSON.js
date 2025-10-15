#!/usr/bin/env node

/**
 * AUTO UPDATE APP.JSON - INTELLIGENT & DYNAMIC
 * 
 * Mise à jour automatique, dynamique et intelligente de l'app.json:
 * - Synchronisation complète des drivers depuis le dossier drivers/
 * - Mise à jour automatique de la version (patch increment)
 * - Vérification et correction des capabilities
 * - Mise à jour des settings avec best practices
 * - Validation SDK3 Homey complète
 * - Nettoyage des doublons manufacturer IDs
 * 
 * @version 2.1.42
 * @author Dylan Rajasekaram
 */

const fs = require('fs');
const path = require('path');

const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  red: '\x1b[31m',
  cyan: '\x1b[36m',
  magenta: '\x1b[35m'
};

class IntelligentAppJsonUpdater {
  constructor() {
    this.rootDir = path.join(__dirname, '..');
    this.driversAdded = [];
    this.driversUpdated = [];
    this.driversFixed = [];
    this.versionUpdated = false;
    this.settings = {
      debug_logging: { type: 'checkbox', default: false },
      community_updates: { type: 'checkbox', default: true },
      reporting_interval: { type: 'number', min: 60, max: 3600, default: 300 },
      temperature_offset: { type: 'number', min: -10, max: 10, default: 0 },
      humidity_offset: { type: 'number', min: -20, max: 20, default: 0 },
      battery_reporting_threshold: { type: 'number', min: 1, max: 20, default: 5 }
    };
  }

  log(msg, color = 'blue') {
    console.log(`${colors[color]}${msg}${colors.reset}`);
  }

  incrementVersion(version) {
    const parts = version.split('.');
    const major = parseInt(parts[0]);
    const minor = parseInt(parts[1]);
    const patch = parseInt(parts[2]);
    return `${major}.${minor}.${patch + 1}`;
  }

  validateCapabilities(driver) {
    // Capabilities SDK3 validées
    const validCapabilities = [
      'onoff', 'dim', 'light_hue', 'light_saturation', 'light_temperature', 'light_mode',
      'measure_temperature', 'measure_humidity', 'measure_co2', 'measure_pm25',
      'measure_battery', 'measure_power', 'measure_voltage', 'measure_current',
      'measure_luminance', 'measure_pressure', 'measure_noise', 'measure_rain',
      'measure_wind_strength', 'measure_wind_angle', 'measure_gust_strength',
      'alarm_motion', 'alarm_contact', 'alarm_tamper', 'alarm_smoke', 'alarm_co',
      'alarm_co2', 'alarm_water', 'alarm_heat', 'alarm_fire', 'alarm_generic',
      'alarm_battery', 'locked', 'lock_mode', 'target_temperature', 'thermostat_mode',
      'windowcoverings_state', 'windowcoverings_set', 'button', 'volume_set',
      'volume_up', 'volume_down', 'volume_mute', 'channel_up', 'channel_down'
    ];

    const capabilities = driver.capabilities || [];
    const fixed = capabilities.filter(cap => {
      if (typeof cap === 'string' && validCapabilities.includes(cap)) {
        return true;
      }
      return false;
    });

    return fixed;
  }

  cleanManufacturerIds(manufacturerName) {
    if (!Array.isArray(manufacturerName)) {
      return [manufacturerName].filter(Boolean);
    }

    // Supprimer les doublons et trier
    const unique = [...new Set(manufacturerName)];
    return unique.filter(name => name && name.trim() !== '');
  }

  fixDriverStructure(driver) {
    const fixed = { ...driver };
    let hasChanges = false;

    // 1. Valider capabilities
    const originalCaps = JSON.stringify(fixed.capabilities);
    fixed.capabilities = this.validateCapabilities(fixed);
    if (JSON.stringify(fixed.capabilities) !== originalCaps) {
      hasChanges = true;
    }

    // 2. Nettoyer manufacturer IDs
    if (fixed.zigbee?.manufacturerName) {
      const originalMfg = JSON.stringify(fixed.zigbee.manufacturerName);
      fixed.zigbee.manufacturerName = this.cleanManufacturerIds(fixed.zigbee.manufacturerName);
      if (JSON.stringify(fixed.zigbee.manufacturerName) !== originalMfg) {
        hasChanges = true;
      }
    }

    // 3. Valider productId (array de strings)
    if (fixed.zigbee?.productId) {
      if (!Array.isArray(fixed.zigbee.productId)) {
        fixed.zigbee.productId = [fixed.zigbee.productId];
        hasChanges = true;
      }
      fixed.zigbee.productId = [...new Set(fixed.zigbee.productId)].filter(Boolean);
    }

    // 4. Valider clusters (numeric)
    if (fixed.zigbee?.endpoints) {
      Object.values(fixed.zigbee.endpoints).forEach(endpoint => {
        if (endpoint.clusters) {
          endpoint.clusters = endpoint.clusters.map(c => typeof c === 'number' ? c : parseInt(c));
        }
        if (endpoint.bindings) {
          endpoint.bindings = endpoint.bindings.map(b => typeof b === 'number' ? b : parseInt(b));
        }
      });
      hasChanges = true;
    }

    // 5. Valider energy.batteries
    if (fixed.capabilities?.includes('measure_battery') && !fixed.energy?.batteries) {
      fixed.energy = fixed.energy || {};
      fixed.energy.batteries = ['CR2032'];
      hasChanges = true;
    }

    // 6. Valider class
    const validClasses = ['light', 'socket', 'sensor', 'button', 'thermostat', 'windowcoverings', 'lock'];
    if (fixed.class && !validClasses.includes(fixed.class)) {
      // Mapper les classes invalides
      if (fixed.class === 'switch') {
        fixed.class = 'socket';
      } else {
        fixed.class = 'sensor';
      }
      hasChanges = true;
    }

    return { fixed, hasChanges };
  }

  async run() {
    try {
      this.log('\n' + '='.repeat(80), 'cyan');
      this.log('🤖 INTELLIGENT APP.JSON AUTO-UPDATER', 'cyan');
      this.log('='.repeat(80) + '\n', 'cyan');

      // 1. Lire app.json
      const appJsonPath = path.join(this.rootDir, 'app.json');
      const appJson = JSON.parse(fs.readFileSync(appJsonPath, 'utf-8'));
      const originalVersion = appJson.version;

      this.log(`📋 Version actuelle: ${originalVersion}`, 'blue');

      // 2. Mise à jour automatique de la version
      const newVersion = this.incrementVersion(originalVersion);
      appJson.version = newVersion;
      this.versionUpdated = true;
      this.log(`🆙 Nouvelle version: ${newVersion}`, 'green');

      // 3. Mise à jour package.json
      const packageJsonPath = path.join(this.rootDir, 'package.json');
      if (fs.existsSync(packageJsonPath)) {
        const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf-8'));
        packageJson.version = newVersion;
        fs.writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2), 'utf-8');
        this.log(`✅ package.json mis à jour: ${newVersion}`, 'green');
      }

      // 4. Synchroniser les drivers
      const driversDir = path.join(this.rootDir, 'drivers');
      const driverFolders = fs.readdirSync(driversDir).filter(dir => {
        return fs.statSync(path.join(driversDir, dir)).isDirectory();
      });

      this.log(`\n📁 Analyse de ${driverFolders.length} drivers...`, 'blue');

      // Map des drivers existants
      const existingDrivers = new Map();
      if (appJson.drivers) {
        appJson.drivers.forEach(driver => {
          existingDrivers.set(driver.id, driver);
        });
      }

      // Synchroniser chaque driver
      for (const driverId of driverFolders) {
        const driverPath = path.join(driversDir, driverId);
        const composePath = path.join(driverPath, 'driver.compose.json');

        if (!fs.existsSync(composePath)) {
          this.log(`⚠ ${driverId}: Pas de driver.compose.json`, 'yellow');
          continue;
        }

        try {
          const compose = JSON.parse(fs.readFileSync(composePath, 'utf-8'));

          // Fix structure
          const { fixed: fixedCompose, hasChanges } = this.fixDriverStructure(compose);

          if (!existingDrivers.has(driverId)) {
            // Driver manquant
            this.log(`✅ AJOUT: ${driverId}`, 'green');
            if (!appJson.drivers) appJson.drivers = [];
            appJson.drivers.push({ id: driverId, ...fixedCompose });
            this.driversAdded.push(driverId);
          } else {
            // Driver existe - vérifier mise à jour
            const existing = existingDrivers.get(driverId);
            const { fixed: fixedExisting } = this.fixDriverStructure(existing);
            
            if (JSON.stringify(fixedExisting) !== JSON.stringify(fixedCompose)) {
              this.log(`🔄 UPDATE: ${driverId}`, 'yellow');
              const index = appJson.drivers.findIndex(d => d.id === driverId);
              if (index !== -1) {
                appJson.drivers[index] = { id: driverId, ...fixedCompose };
                this.driversUpdated.push(driverId);
              }
            }
          }

          if (hasChanges) {
            this.driversFixed.push(driverId);
          }
        } catch (error) {
          this.log(`❌ ${driverId}: ${error.message}`, 'red');
        }
      }

      // 5. Mise à jour settings intelligente
      this.log('\n🔧 Mise à jour des settings...', 'blue');
      if (!appJson.settings) appJson.settings = [];
      
      // Vérifier chaque setting
      Object.keys(this.settings).forEach(settingId => {
        const exists = appJson.settings.find(s => s.id === settingId);
        if (!exists) {
          const config = this.settings[settingId];
          const setting = {
            id: settingId,
            type: config.type,
            title: { en: settingId.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()) },
            value: config.default
          };
          
          if (config.min !== undefined) setting.min = config.min;
          if (config.max !== undefined) setting.max = config.max;
          
          appJson.settings.push(setting);
          this.log(`✅ Setting ajouté: ${settingId}`, 'green');
        }
      });

      // 6. Sauvegarder app.json
      fs.writeFileSync(appJsonPath, JSON.stringify(appJson, null, 2), 'utf-8');

      // 7. Rapport final
      this.log('\n' + '='.repeat(80), 'green');
      this.log('✅ MISE À JOUR INTELLIGENTE TERMINÉE', 'green');
      this.log('='.repeat(80), 'green');
      
      this.log(`\n📊 Version: ${originalVersion} → ${newVersion}`, 'cyan');
      this.log(`📊 Drivers ajoutés: ${this.driversAdded.length}`, 'green');
      this.log(`📊 Drivers mis à jour: ${this.driversUpdated.length}`, 'yellow');
      this.log(`📊 Drivers corrigés: ${this.driversFixed.length}`, 'blue');
      this.log(`📊 Total drivers: ${appJson.drivers.length}`, 'cyan');

      if (this.driversAdded.length > 0) {
        this.log('\n✨ Drivers ajoutés:', 'green');
        this.driversAdded.slice(0, 10).forEach(d => this.log(`   - ${d}`, 'green'));
        if (this.driversAdded.length > 10) {
          this.log(`   ... et ${this.driversAdded.length - 10} autres`, 'green');
        }
      }

      if (this.driversUpdated.length > 0) {
        this.log('\n🔄 Drivers mis à jour:', 'yellow');
        this.driversUpdated.slice(0, 10).forEach(d => this.log(`   - ${d}`, 'yellow'));
        if (this.driversUpdated.length > 10) {
          this.log(`   ... et ${this.driversUpdated.length - 10} autres`, 'yellow');
        }
      }

      this.log('\n✅ app.json et package.json sauvegardés avec succès!\n', 'green');

    } catch (error) {
      this.log(`\n❌ ERREUR: ${error.message}\n`, 'red');
      console.error(error);
      process.exit(1);
    }
  }
}

if (require.main === module) {
  const updater = new IntelligentAppJsonUpdater();
  updater.run();
}

module.exports = IntelligentAppJsonUpdater;
