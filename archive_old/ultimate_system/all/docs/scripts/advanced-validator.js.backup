const fs = require('fs');
const path = require('path');
const { Validator } = require('jsonschema');
const axios = require('axios');

class ComprehensiveValidator {
  constructor() {
    this.validator = new Validator();
    this.errors = [];
    this.warnings = [];
    this.stats = {
      drivers: 0,
      validDrivers: 0,
      devicesSupported: 0
    };
  }

  async validateCompleteProject() {
    console.log('🚀 Démarrage de la validation complète du projet...\n');

    // Validation en parallèle
    await Promise.all([
      this.validateProjectStructure(),
      this.validateAllJsonFiles(),
      this.validateDependencies(),
      this.validateAgainstZigbee2MQTT(),
      this.validateCapabilitiesConsistency()
    ]);

    this.generateReport();
    
    return {
      valid: this.errors.length === 0,
      errors: this.errors,
      warnings: this.warnings,
      stats: this.stats
    };
  }

  async validateAgainstZigbee2MQTT() {
    try {
      this.log('📡 Récupération de la liste des devices Zigbee2MQTT...');
      
      const response = await axios.get(
        'https://zigbee2mqtt.io/supported-devices/', 
        { timeout: 10000 }
      );
      
      const supportedDevices = this.parseZ2MDevices(response.data);
      this.compareWithZigbee2MQTT(supportedDevices);
      
    } catch (error) {
      this.warnings.push(
        'Échec récupération liste Zigbee2MQTT: ' + error.message
      );
    }
  }

  parseZ2MDevices(htmlContent) {
    // Implémentation de l'extraction des devices depuis le HTML
    const devices = [];
    // Regex pour extraire les devices supportés
    const deviceRegex = /<tr>[^]*?<td>([^<]+)<\/td>[^]*?<td>([^<]+)<\/td>/g;
    let match;
    
    while ((match = deviceRegex.exec(htmlContent)) !== null) {
      devices.push({
        manufacturer: match[1].trim(),
        model: match[2].trim()
      });
    }
    
    return devices;
  }

  compareWithZigbee2MQTT(z2mDevices) {
    const driversPath = path.join(__dirname, '..', 'drivers');
    const drivers = this.findDriverFiles(driversPath);
    
    drivers.forEach(driver => {
      const composePath = path.join(driver.path, 'driver.compose.json');
      if (fs.existsSync(composePath)) {
        try {
          const compose = JSON.parse(fs.readFileSync(composePath, 'utf8'));
          const zigbeeInfo = compose.zigbee;
          
          if (zigbeeInfo && zigbeeInfo.manufacturer && zigbeeInfo.model) {
            const isSupported = z2mDevices.some(device => 
              device.manufacturer === zigbeeInfo.manufacturer &&
              device.model === zigbeeInfo.model
            );
            
            if (!isSupported) {
              this.warnings.push(
                `Device non supporté par Z2M: ${zigbeeInfo.manufacturer} ${zigbeeInfo.model}`
              );
            }
          }
        } catch (error) {
          this.errors.push(`Erreur lecture compose: ${composePath}`);
        }
      }
    });
  }

  validateCapabilitiesConsistency() {
    const driversPath = path.join(__dirname, '..', 'drivers');
    const drivers = this.findDriverFiles(driversPath);
    
    drivers.forEach(driver => {
      const composePath = path.join(driver.path, 'driver.compose.json');
      const devicePath = path.join(driver.path, 'device.js');
      
      if (fs.existsSync(composePath) && fs.existsSync(devicePath)) {
        try {
          const compose = JSON.parse(fs.readFileSync(composePath, 'utf8'));
          const deviceCode = fs.readFileSync(devicePath, 'utf8');
          
          // Vérification de la cohérence entre compose et device.js
          this.validateCapabilitiesMatch(compose, deviceCode, driver.name);
        } catch (error) {
          this.errors.push(`Erreur validation capabilities: ${driver.name}`);
        }
      }
    });
  }

  validateCapabilitiesMatch(compose, deviceCode, driverName) {
    const composeCapabilities = compose.capabilities || [];
    const deviceCapabilities = this.extractCapabilitiesFromCode(deviceCode);
    
    // Vérification que toutes les capabilities du compose sont implémentées
    composeCapabilities.forEach(cap => {
      if (!deviceCapabilities.includes(cap.id)) {
        this.warnings.push(
          `Capability ${cap.id} déclarée mais non implémentée dans: ${driverName}`
        );
      }
    });
  }

  extractCapabilitiesFromCode(code) {
    const regex = /registerCapability.*?['"]([^'"]+)['"]/g;
    const capabilities = [];
    let match;
    
    while ((match = regex.exec(code)) !== null) {
      capabilities.push(match[1]);
    }
    
    return capabilities;
  }

  generateReport() {
    console.log('\n' + '='.repeat(60));
    console.log('📊 RAPPORT DE VALIDATION COMPLET');
    console.log('='.repeat(60));
    
    console.log(`\n📦 Drivers analysés: ${this.stats.drivers}`);
    console.log(`✅ Drivers valides: ${this.stats.validDrivers}`);
    console.log(`📱 Devices supportés: ${this.stats.devicesSupported}`);
    
    if (this.errors.length > 0) {
      console.log(`\n❌ ERREURS (${this.errors.length}):`);
      this.errors.forEach((error, index) => {
        console.log(`${index + 1}. ${error}`);
      });
    }
    
    if (this.warnings.length > 0) {
      console.log(`\n⚠️  AVERTISSEMENTS (${this.warnings.length}):`);
      this.warnings.forEach((warning, index) => {
        console.log(`${index + 1}. ${warning}`);
      });
    }
    
    console.log('\n' + '='.repeat(60));
  }
}

module.exports = ComprehensiveValidator;
