const fs = require('fs');
const path = require('path');

class ImportsAndClassesFixer {
  constructor() {
    this.fixed = [];
    this.errors = [];
  }

  async fixAllImportsAndClasses() {
    console.log('🔧 CORRECTION AUTOMATIQUE IMPORTS ET CLASSES...\n');
    
    const driversPath = './drivers';
    const drivers = fs.readdirSync(driversPath, { withFileTypes: true })
      .filter(item => item.isDirectory())
      .map(item => item.name);
    
    console.log(`📊 Processing ${drivers.length} drivers...`);
    
    for (const driverId of drivers) {
      await this.fixDriverFiles(driverId);
    }
    
    this.generateFixReport();
  }

  async fixDriverFiles(driverId) {
    const driverPath = path.join('./drivers', driverId);
    
    // Fix device.js
    await this.fixDeviceFile(driverId, driverPath);
    
    // Fix driver.js
    await this.fixDriverFile(driverId, driverPath);
    
    // Ensure files exist if missing
    await this.ensureFilesExist(driverId, driverPath);
  }

  async fixDeviceFile(driverId, driverPath) {
    const deviceFile = path.join(driverPath, 'device.js');
    
    if (fs.existsSync(deviceFile)) {
      try {
        let content = fs.readFileSync(deviceFile, 'utf8');
        const className = this.getPascalCase(driverId) + 'Device';
        
        // Fix import
        if (!content.includes('homey-zigbeedriver')) {
          content = `'use strict';\n\nconst { ZigBeeDevice } = require('homey-zigbeedriver');\n\n${content.replace(/^['"]use strict['"];?\s*\n/m, '')}`;
          this.fixed.push(`Added ZigBeeDevice import to ${driverId}/device.js`);
        }
        
        // Fix class name and structure
        const classRegex = /class\s+(\w+)\s+extends/;
        const match = content.match(classRegex);
        
        if (!match || match[1] !== className) {
          content = this.generateCorrectDeviceFile(driverId, className);
          this.fixed.push(`Fixed device class structure for ${driverId}`);
        }
        
        fs.writeFileSync(deviceFile, content);
        
      } catch (error) {
        this.errors.push(`Error fixing ${driverId}/device.js: ${error.message}`);
      }
    }
  }

  async fixDriverFile(driverId, driverPath) {
    const driverFile = path.join(driverPath, 'driver.js');
    
    if (fs.existsSync(driverFile)) {
      try {
        let content = fs.readFileSync(driverFile, 'utf8');
        const className = this.getPascalCase(driverId) + 'Driver';
        
        // Fix import
        if (!content.includes('homey-zigbeedriver')) {
          content = `'use strict';\n\nconst { ZigBeeDriver } = require('homey-zigbeedriver');\n\n${content.replace(/^['"]use strict['"];?\s*\n/m, '')}`;
          this.fixed.push(`Added ZigBeeDriver import to ${driverId}/driver.js`);
        }
        
        // Fix class name and structure
        const classRegex = /class\s+(\w+)\s+extends/;
        const match = content.match(classRegex);
        
        if (!match || match[1] !== className) {
          content = this.generateCorrectDriverFile(driverId, className);
          this.fixed.push(`Fixed driver class structure for ${driverId}`);
        }
        
        fs.writeFileSync(driverFile, content);
        
      } catch (error) {
        this.errors.push(`Error fixing ${driverId}/driver.js: ${error.message}`);
      }
    }
  }

  async ensureFilesExist(driverId, driverPath) {
    const deviceFile = path.join(driverPath, 'device.js');
    const driverFile = path.join(driverPath, 'driver.js');
    
    // Create device.js if missing
    if (!fs.existsSync(deviceFile)) {
      const className = this.getPascalCase(driverId) + 'Device';
      const content = this.generateCorrectDeviceFile(driverId, className);
      fs.writeFileSync(deviceFile, content);
      this.fixed.push(`Created missing device.js for ${driverId}`);
    }
    
    // Create driver.js if missing
    if (!fs.existsSync(driverFile)) {
      const className = this.getPascalCase(driverId) + 'Driver';
      const content = this.generateCorrectDriverFile(driverId, className);
      fs.writeFileSync(driverFile, content);
      this.fixed.push(`Created missing driver.js for ${driverId}`);
    }
  }

  generateCorrectDeviceFile(driverId, className) {
    const capabilities = this.getDeviceCapabilities(driverId);
    const capabilityInit = this.generateCapabilityInitCode(driverId, capabilities);
    
    return `'use strict';

const { ZigBeeDevice } = require('homey-zigbeedriver');

class ${className} extends ZigBeeDevice {

  async onNodeInit() {
    this.log('${driverId} device initialized');
    
    ${capabilityInit}
    
    await super.onNodeInit();
  }

  ${this.generateDeviceSpecificMethods(driverId)}
}

module.exports = ${className};
`;
  }

  generateCorrectDriverFile(driverId, className) {
    return `'use strict';

const { ZigBeeDriver } = require('homey-zigbeedriver');

class ${className} extends ZigBeeDriver {

  onInit() {
    this.log('${driverId} driver initialized');
    super.onInit();
  }

}

module.exports = ${className};
`;
  }

  getDeviceCapabilities(driverId) {
    const id = driverId.toLowerCase();
    let capabilities = ['onoff'];
    
    if (id.includes('light')) capabilities = ['onoff', 'dim'];
    if (id.includes('sensor') || id.includes('motion')) capabilities = ['alarm_motion', 'measure_battery'];
    if (id.includes('temperature')) capabilities.push('measure_temperature');
    if (id.includes('humidity')) capabilities.push('measure_humidity');
    if (id.includes('plug') || id.includes('ts011')) capabilities = ['onoff', 'measure_power'];
    if (id.includes('thermostat')) capabilities = ['target_temperature', 'measure_temperature'];
    if (id.includes('lock')) capabilities = ['locked'];
    
    return [...new Set(capabilities)];
  }

  generateCapabilityInitCode(driverId, capabilities) {
    const lines = [];
    
    for (const cap of capabilities) {
      switch (cap) {
        case 'onoff':
          lines.push('this.registerCapability(\'onoff\', \'genOnOff\');');
          break;
        case 'dim':
          lines.push('this.registerCapability(\'dim\', \'genLevelCtrl\');');
          break;
        case 'alarm_motion':
          lines.push('this.registerCapability(\'alarm_motion\', \'msOccupancySensing\');');
          break;
        case 'measure_temperature':
          lines.push('this.registerCapability(\'measure_temperature\', \'msTemperatureMeasurement\');');
          break;
        case 'measure_humidity':
          lines.push('this.registerCapability(\'measure_humidity\', \'msRelativeHumidity\');');
          break;
        case 'measure_battery':
          lines.push('this.registerCapability(\'measure_battery\', \'genPowerCfg\');');
          break;
        case 'measure_power':
          lines.push('this.registerCapability(\'measure_power\', \'haElectricalMeasurement\');');
          break;
        case 'target_temperature':
          lines.push('this.registerCapability(\'target_temperature\', \'hvacThermostat\');');
          break;
        case 'locked':
          lines.push('this.registerCapability(\'locked\', \'closuresDoorLock\');');
          break;
      }
    }
    
    return lines.join('\n    ');
  }

  generateDeviceSpecificMethods(driverId) {
    const id = driverId.toLowerCase();
    
    if (id.includes('motion')) {
      return `
  onMsOccupancySensingAttributeReport(report) {
    const motion = report.occupancy === 1;
    this.setCapabilityValue('alarm_motion', motion);
    this.log('Motion detected:', motion);
  }`;
    }
    
    if (id.includes('temperature')) {
      return `
  onMsTemperatureMeasurementAttributeReport(report) {
    const temperature = report.measuredValue / 100;
    this.setCapabilityValue('measure_temperature', temperature);
    this.log('Temperature updated:', temperature);
  }`;
    }
    
    if (id.includes('ts0601') || id.includes('tuya')) {
      return `
  async onData(report) {
    // Handle Tuya EF00 datapoints
    if (report.cluster === 'manuSpecificTuya') {
      const { dp, datatype, data } = report.data;
      this.processTuyaData(dp, datatype, data);
    }
  }
  
  processTuyaData(dp, datatype, data) {
    this.log('Tuya DP received:', { dp, datatype, data });
    // Add specific DP handling based on device type
  }`;
    }
    
    return `
  // Device-specific methods can be added here`;
  }

  getPascalCase(str) {
    return str.split(/[-_]/).map(part => 
      part.charAt(0).toUpperCase() + part.slice(1).toLowerCase()
    ).join('');
  }

  generateFixReport() {
    console.log('\n📊 RAPPORT CORRECTION IMPORTS/CLASSES:');
    console.log(`✅ Corrections appliquées: ${this.fixed.length}`);
    console.log(`❌ Erreurs rencontrées: ${this.errors.length}`);
    
    if (this.errors.length > 0) {
      console.log('\n❌ ERREURS:');
      for (const error of this.errors.slice(0, 10)) {
        console.log(`  - ${error}`);
      }
    }
    
    console.log('\n✅ CORRECTIONS (premiers 20):');
    for (const fix of this.fixed.slice(0, 20)) {
      console.log(`  - ${fix}`);
    }
    if (this.fixed.length > 20) {
      console.log(`  ... et ${this.fixed.length - 20} autres corrections`);
    }
    
    const report = {
      timestamp: new Date().toISOString(),
      fixesApplied: this.fixed.length,
      errorsEncountered: this.errors.length,
      fixes: this.fixed,
      errors: this.errors
    };
    
    fs.writeFileSync('./imports_fixes_report.json', JSON.stringify(report, null, 2));
    console.log('\n📄 Rapport sauvé: imports_fixes_report.json');
    
    console.log('\n🚀 TOUS LES IMPORTS ET CLASSES CORRIGÉS!');
  }
}

// Exécuter les corrections
const fixer = new ImportsAndClassesFixer();
fixer.fixAllImportsAndClasses().catch(console.error);
