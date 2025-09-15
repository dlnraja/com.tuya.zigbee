const fs = require('fs');
const path = require('path');

class DriverStructureFixer {
  constructor() {
    this.fixed = [];
    this.errors = [];
  }

  async fixDriverStructure() {
    console.log('🔧 Fixing driver structure issues...\n');
    
    // 1. Check if backup exists and restore properly
    await this.restoreFromBackup();
    
    // 2. Create proper driver structure with real content
    await this.createProperDriverStructure();
    
    // 3. Fix all driver compose files
    await this.fixAllDriverComposeFiles();
    
    // 4. Generate final report
    this.generateReport();
  }

  async restoreFromBackup() {
    console.log('📦 Checking backup and restoring drivers...');
    
    const backupPath = './drivers_backup';
    const driversPath = './drivers';
    
    if (fs.existsSync(backupPath)) {
      // Remove empty driver structure
      if (fs.existsSync(driversPath)) {
        fs.rmSync(driversPath, { recursive: true, force: true });
      }
      
      // Copy from backup and reorganize properly
      fs.mkdirSync(driversPath, { recursive: true });
      
      const categories = {
        light: [],
        sensor: [],
        switch: [],
        thermostat: [],
        lock: [],
        other: []
      };
      
      // Scan backup for drivers
      const backupItems = fs.readdirSync(backupPath, { withFileTypes: true });
      
      for (const item of backupItems) {
        if (!item.isDirectory()) continue;
        
        const driverPath = path.join(backupPath, item.name);
        const composeFile = path.join(driverPath, 'driver.compose.json');
        
        if (fs.existsSync(composeFile)) {
          try {
            const config = JSON.parse(fs.readFileSync(composeFile, 'utf8'));
            const category = this.categorizeDriver(config, item.name);
            categories[category].push({
              id: config.id || item.name,
              path: driverPath,
              name: item.name
            });
          } catch (error) {
            console.log(`⚠️ Could not process ${item.name}: ${error.message}`);
          }
        }
      }
      
      // Create organized structure
      for (const [category, drivers] of Object.entries(categories)) {
        if (drivers.length === 0) continue;
        
        const categoryPath = path.join(driversPath, category);
        fs.mkdirSync(categoryPath, { recursive: true });
        
        for (const driver of drivers) {
          const targetPath = path.join(categoryPath, driver.id);
          
          try {
            // Copy entire driver directory
            this.copyDirectory(driver.path, targetPath);
            console.log(`  ✅ ${driver.id} -> ${category}/${driver.id}`);
            this.fixed.push(`${driver.id} restored to ${category}`);
          } catch (error) {
            console.log(`  ❌ Failed to copy ${driver.id}: ${error.message}`);
            this.errors.push(`${driver.id}: ${error.message}`);
          }
        }
      }
      
      console.log(`📁 Restored ${this.fixed.length} drivers from backup`);
    }
  }

  categorizeDriver(config, driverName) {
    const id = (config.id || driverName).toLowerCase();
    const className = (config.class || '').toLowerCase();
    
    // By class first
    if (['light', 'sensor', 'thermostat', 'lock'].includes(className)) {
      return className;
    }
    if (className === 'socket') return 'switch';
    
    // By keywords in ID
    if (id.includes('light') || id.includes('bulb') || id.includes('led')) return 'light';
    if (id.includes('motion') || id.includes('sensor') || id.includes('temperature') || 
        id.includes('humidity') || id.includes('contact') || id.includes('smoke') || 
        id.includes('water') || id.includes('radar') || id.includes('soil')) return 'sensor';
    if (id.includes('switch') || id.includes('plug') || id.includes('socket') || id.includes('ts011')) return 'switch';
    if (id.includes('thermostat') || id.includes('climate') || id.includes('ac')) return 'thermostat';
    if (id.includes('lock')) return 'lock';
    
    return 'other';
  }

  copyDirectory(source, target) {
    if (!fs.existsSync(source)) {
      throw new Error(`Source directory does not exist: ${source}`);
    }
    
    fs.mkdirSync(target, { recursive: true });
    
    const items = fs.readdirSync(source, { withFileTypes: true });
    
    for (const item of items) {
      const sourcePath = path.join(source, item.name);
      const targetPath = path.join(target, item.name);
      
      if (item.isDirectory()) {
        this.copyDirectory(sourcePath, targetPath);
      } else {
        fs.copyFileSync(sourcePath, targetPath);
      }
    }
  }

  async createProperDriverStructure() {
    console.log('🏗️ Creating proper driver structure...');
    
    const driversPath = './drivers';
    if (!fs.existsSync(driversPath)) {
      console.log('⚠️ No drivers directory found');
      return;
    }
    
    const categories = fs.readdirSync(driversPath, { withFileTypes: true });
    
    for (const category of categories) {
      if (!category.isDirectory()) continue;
      
      const categoryPath = path.join(driversPath, category.name);
      const drivers = fs.readdirSync(categoryPath, { withFileTypes: true });
      
      for (const driver of drivers) {
        if (!driver.isDirectory()) continue;
        
        const driverPath = path.join(categoryPath, driver.name);
        await this.ensureDriverHasAllFiles(driverPath, driver.name, category.name);
      }
    }
  }

  async ensureDriverHasAllFiles(driverPath, driverId, category) {
    // Ensure driver.compose.json exists and is valid
    const composeFile = path.join(driverPath, 'driver.compose.json');
    if (!fs.existsSync(composeFile)) {
      await this.createBasicComposeFile(composeFile, driverId, category);
    } else {
      await this.fixComposeFile(composeFile, driverId, category);
    }
    
    // Ensure device.js exists
    const deviceFile = path.join(driverPath, 'device.js');
    if (!fs.existsSync(deviceFile)) {
      await this.createBasicDeviceFile(deviceFile, driverId, category);
    }
    
    // Ensure driver.js exists
    const driverFile = path.join(driverPath, 'driver.js');
    if (!fs.existsSync(driverFile)) {
      await this.createBasicDriverFile(driverFile, driverId);
    }
    
    // Ensure assets/images exist
    const assetsPath = path.join(driverPath, 'assets', 'images');
    fs.mkdirSync(assetsPath, { recursive: true });
    
    const smallImage = path.join(assetsPath, 'small.png');
    const largeImage = path.join(assetsPath, 'large.png');
    
    if (!fs.existsSync(smallImage) && fs.existsSync('./assets/images/small.png')) {
      fs.copyFileSync('./assets/images/small.png', smallImage);
    }
    
    if (!fs.existsSync(largeImage) && fs.existsSync('./assets/images/large.png')) {
      fs.copyFileSync('./assets/images/large.png', largeImage);
    }
  }

  async createBasicComposeFile(filePath, driverId, category) {
    const capabilities = this.getCapabilitiesForCategory(category, driverId);
    const clusters = this.getClustersForCategory(category, driverId);
    const bindings = this.getBindingsForCategory(category, driverId);
    
    const config = {
      id: driverId,
      name: {
        en: this.getDisplayName(driverId, category),
        fr: this.getDisplayName(driverId, category, 'fr'),
        nl: this.getDisplayName(driverId, category, 'nl')
      },
      class: this.getClassForCategory(category),
      capabilities: capabilities,
      zigbee: {
        manufacturerName: ["Tuya"],
        productId: [driverId.replace('tuya_', '').toUpperCase()],
        endpoints: {
          "1": {
            clusters: clusters,
            bindings: bindings
          }
        }
      },
      images: {
        small: "{{driverAssetsPath}}/images/small.png",
        large: "{{driverAssetsPath}}/images/large.png"
      }
    };
    
    // Add energy config for battery devices
    if (capabilities.includes('measure_battery')) {
      config.energy = { batteries: ['INTERNAL'] };
    }
    
    // Add settings based on category
    if (category === 'sensor' && driverId.includes('motion')) {
      config.settings = [
        {
          id: "sensitivity",
          type: "dropdown",
          value: "medium",
          label: {
            en: "Motion Sensitivity",
            fr: "Sensibilité de Mouvement", 
            nl: "Bewegingsgevoeligheid"
          },
          values: [
            { id: "low", label: { en: "Low", fr: "Faible", nl: "Laag" } },
            { id: "medium", label: { en: "Medium", fr: "Moyen", nl: "Gemiddeld" } },
            { id: "high", label: { en: "High", fr: "Élevé", nl: "Hoog" } }
          ]
        }
      ];
    }
    
    fs.writeFileSync(filePath, JSON.stringify(config, null, 2));
    console.log(`  📄 Created compose file: ${driverId}`);
  }

  getCapabilitiesForCategory(category, driverId) {
    const base = {
      light: ['onoff'],
      sensor: ['measure_battery'],
      switch: ['onoff'],
      thermostat: ['target_temperature', 'measure_temperature'],
      lock: ['locked'],
      other: ['onoff']
    };
    
    let capabilities = [...(base[category] || base.other)];
    
    // Add specific capabilities based on driver ID
    if (driverId.includes('motion')) {
      capabilities.push('alarm_motion', 'measure_luminance');
    }
    if (driverId.includes('temperature') || driverId.includes('sensor')) {
      capabilities.push('measure_temperature');
    }
    if (driverId.includes('humidity')) {
      capabilities.push('measure_humidity');
    }
    if (driverId.includes('contact')) {
      capabilities.push('alarm_contact');
    }
    if (driverId.includes('smoke')) {
      capabilities.push('alarm_smoke');
    }
    if (driverId.includes('water')) {
      capabilities.push('alarm_water');
    }
    if (driverId.includes('dim') || driverId.includes('light')) {
      capabilities.push('dim');
    }
    if (driverId.includes('color') || driverId.includes('rgb')) {
      capabilities.push('light_hue', 'light_saturation');
    }
    if (driverId.includes('temperature') && driverId.includes('light')) {
      capabilities.push('light_temperature');
    }
    if (driverId.includes('plug') || driverId.includes('ts011')) {
      capabilities.push('measure_power', 'meter_power');
    }
    
    return [...new Set(capabilities)];
  }

  getClustersForCategory(category, driverId) {
    const base = [0, 1, 3]; // Basic, Power, Identify
    
    if (category === 'light') {
      base.push(6, 8); // OnOff, LevelControl
      if (driverId.includes('color') || driverId.includes('temperature')) {
        base.push(768); // ColorControl
      }
    } else if (category === 'sensor') {
      if (driverId.includes('motion')) {
        base.push(1030); // OccupancySensing
      }
      if (driverId.includes('temperature')) {
        base.push(1026); // TemperatureMeasurement
      }
      if (driverId.includes('humidity')) {
        base.push(1029); // RelativeHumidity
      }
      if (driverId.includes('ts0601') || driverId.includes('tuya')) {
        base.push(0xEF00); // Tuya cluster
      }
    } else if (category === 'switch') {
      base.push(6); // OnOff
      if (driverId.includes('plug') || driverId.includes('ts011')) {
        base.push(1794, 2820); // Metering, ElectricalMeasurement
      }
    } else if (category === 'thermostat') {
      base.push(513, 1026); // Thermostat, TemperatureMeasurement
    }
    
    return base;
  }

  getBindingsForCategory(category, driverId) {
    if (driverId.includes('temperature') || driverId.includes('humidity')) {
      return [1026, 1029];
    }
    if (driverId.includes('motion')) {
      return [1030];
    }
    if (category === 'switch' || category === 'light') {
      return [6];
    }
    
    return [1]; // Default power binding
  }

  getClassForCategory(category) {
    const classMap = {
      light: 'light',
      sensor: 'sensor', 
      switch: 'socket',
      thermostat: 'thermostat',
      lock: 'lock',
      other: 'other'
    };
    
    return classMap[category] || 'other';
  }

  getDisplayName(driverId, category, lang = 'en') {
    const translations = {
      en: {
        motion: 'Motion Sensor',
        temperature: 'Temperature Sensor',
        humidity: 'Humidity Sensor', 
        contact: 'Contact Sensor',
        smoke: 'Smoke Detector',
        water: 'Water Sensor',
        light: 'Smart Light',
        switch: 'Smart Switch',
        plug: 'Smart Plug',
        thermostat: 'Smart Thermostat',
        lock: 'Smart Lock',
        other: 'Tuya Device'
      },
      fr: {
        motion: 'Capteur de Mouvement',
        temperature: 'Capteur de Température',
        humidity: 'Capteur d\'Humidité',
        contact: 'Capteur de Contact',
        smoke: 'Détecteur de Fumée', 
        water: 'Capteur d\'Eau',
        light: 'Éclairage Intelligent',
        switch: 'Interrupteur Intelligent',
        plug: 'Prise Intelligente',
        thermostat: 'Thermostat Intelligent',
        lock: 'Serrure Intelligente',
        other: 'Appareil Tuya'
      },
      nl: {
        motion: 'Bewegingssensor',
        temperature: 'Temperatuursensor',
        humidity: 'Vochtigheidssensor',
        contact: 'Contactsensor',
        smoke: 'Rookmelder',
        water: 'Watersensor', 
        light: 'Slimme Verlichting',
        switch: 'Slimme Schakelaar',
        plug: 'Slimme Stekker',
        thermostat: 'Slimme Thermostaat',
        lock: 'Slim Slot',
        other: 'Tuya Apparaat'
      }
    };
    
    // Detect device type from ID
    let deviceType = 'other';
    for (const type of Object.keys(translations.en)) {
      if (driverId.toLowerCase().includes(type)) {
        deviceType = type;
        break;
      }
    }
    
    return translations[lang][deviceType] || `Tuya ${driverId}`;
  }

  async createBasicDeviceFile(filePath, driverId, category) {
    const className = this.toPascalCase(driverId);
    
    const deviceContent = `'use strict';

const { ZigBeeDevice } = require('homey-zigbeedriver');

class ${className}Device extends ZigBeeDevice {

  async onNodeInit() {
    this.log('${driverId} device initialized');
    
    // Initialize capabilities for ${category}
    ${this.generateCapabilityInitCode(category, driverId)}
    
    await super.onNodeInit();
  }

  ${this.generateCategorySpecificMethods(category, driverId)}
}

module.exports = ${className}Device;
`;
    
    fs.writeFileSync(filePath, deviceContent);
    console.log(`  📄 Created device file: ${driverId}`);
  }

  async createBasicDriverFile(filePath, driverId) {
    const className = this.toPascalCase(driverId);
    
    const driverContent = `'use strict';

const { ZigBeeDriver } = require('homey-zigbeedriver');

class ${className}Driver extends ZigBeeDriver {

  onInit() {
    this.log('${driverId} driver initialized');
    super.onInit();
  }

}

module.exports = ${className}Driver;
`;
    
    fs.writeFileSync(filePath, driverContent);
  }

  toPascalCase(str) {
    return str
      .split(/[-_]/)
      .map(part => part.charAt(0).toUpperCase() + part.slice(1))
      .join('');
  }

  generateCapabilityInitCode(category, driverId) {
    if (category === 'sensor') {
      if (driverId.includes('motion')) {
        return `
    // Motion sensor capabilities
    this.registerCapability('alarm_motion', 'msOccupancySensing');
    this.registerCapability('measure_luminance', 'msIlluminanceMeasurement');
    this.registerCapability('measure_battery', 'genPowerCfg');`;
      }
      if (driverId.includes('temperature')) {
        return `
    // Temperature sensor capabilities
    this.registerCapability('measure_temperature', 'msTemperatureMeasurement');
    this.registerCapability('measure_humidity', 'msRelativeHumidity');
    this.registerCapability('measure_battery', 'genPowerCfg');`;
      }
    } else if (category === 'light') {
      return `
    // Light capabilities
    this.registerCapability('onoff', 'genOnOff');
    this.registerCapability('dim', 'genLevelCtrl');`;
    } else if (category === 'switch') {
      return `
    // Switch capabilities
    this.registerCapability('onoff', 'genOnOff');`;
    }
    
    return `
    // Basic capabilities
    this.registerCapability('onoff', 'genOnOff');`;
  }

  generateCategorySpecificMethods(category, driverId) {
    if (category === 'sensor' && driverId.includes('temperature')) {
      return `
  onMsTemperatureMeasurementAttributeReport(report) {
    const temperature = report.measuredValue / 100;
    this.setCapabilityValue('measure_temperature', temperature);
    this.log('Temperature updated:', temperature);
  }

  onMsRelativeHumidityAttributeReport(report) {
    const humidity = report.measuredValue / 100;
    this.setCapabilityValue('measure_humidity', humidity);  
    this.log('Humidity updated:', humidity);
  }`;
    }
    
    if (category === 'sensor' && driverId.includes('motion')) {
      return `
  onMsOccupancySensingAttributeReport(report) {
    const motion = report.occupancy === 1;
    this.setCapabilityValue('alarm_motion', motion);
    this.log('Motion detected:', motion);
  }`;
    }
    
    return `
  // Category-specific methods for ${category} devices`;
  }

  async fixComposeFile(filePath, driverId, category) {
    try {
      const config = JSON.parse(fs.readFileSync(filePath, 'utf8'));
      let modified = false;
      
      // Ensure proper ID
      if (!config.id) {
        config.id = driverId;
        modified = true;
      }
      
      // Ensure proper class
      const correctClass = this.getClassForCategory(category);
      if (config.class !== correctClass) {
        config.class = correctClass;
        modified = true;
      }
      
      // Fix image paths
      if (!config.images || !config.images.small || !config.images.large) {
        config.images = {
          small: "{{driverAssetsPath}}/images/small.png",
          large: "{{driverAssetsPath}}/images/large.png"
        };
        modified = true;
      }
      
      // Add energy config for battery devices
      if (config.capabilities?.includes('measure_battery') && !config.energy) {
        config.energy = { batteries: ['INTERNAL'] };
        modified = true;
      }
      
      // Fix zigbee configuration
      if (config.zigbee?.endpoints) {
        for (const [endpoint, endpointConfig] of Object.entries(config.zigbee.endpoints)) {
          if (endpointConfig.clusters) {
            const newClusters = endpointConfig.clusters.map(cluster => {
              if (typeof cluster === 'string' && cluster.startsWith('0x')) {
                return parseInt(cluster, 16);
              }
              return typeof cluster === 'number' ? cluster : parseInt(cluster, 10);
            });
            
            if (JSON.stringify(newClusters) !== JSON.stringify(endpointConfig.clusters)) {
              endpointConfig.clusters = newClusters;
              modified = true;
            }
          }
          
          if (endpointConfig.bindings) {
            const newBindings = endpointConfig.bindings.map(binding => {
              if (typeof binding === 'object') return binding;
              if (typeof binding === 'string' && binding.startsWith('0x')) {
                return parseInt(binding, 16);
              }
              return typeof binding === 'number' ? binding : parseInt(binding, 10);
            });
            
            if (JSON.stringify(newBindings) !== JSON.stringify(endpointConfig.bindings)) {
              endpointConfig.bindings = newBindings;
              modified = true;
            }
          }
        }
      }
      
      if (modified) {
        fs.writeFileSync(filePath, JSON.stringify(config, null, 2));
        console.log(`  🔧 Fixed compose file: ${driverId}`);
        this.fixed.push(`${driverId} compose file fixed`);
      }
      
    } catch (error) {
      console.log(`  ❌ Could not fix compose file for ${driverId}: ${error.message}`);
      this.errors.push(`${driverId} compose fix: ${error.message}`);
    }
  }

  async fixAllDriverComposeFiles() {
    console.log('🔧 Fixing all driver compose files...');
    
    const driversPath = './drivers';
    if (!fs.existsSync(driversPath)) return;
    
    const categories = fs.readdirSync(driversPath, { withFileTypes: true });
    
    for (const category of categories) {
      if (!category.isDirectory()) continue;
      
      const categoryPath = path.join(driversPath, category.name);
      const drivers = fs.readdirSync(categoryPath, { withFileTypes: true });
      
      for (const driver of drivers) {
        if (!driver.isDirectory()) continue;
        
        const driverPath = path.join(categoryPath, driver.name);
        const composeFile = path.join(driverPath, 'driver.compose.json');
        
        if (fs.existsSync(composeFile)) {
          await this.fixComposeFile(composeFile, driver.name, category.name);
        }
      }
    }
  }

  generateReport() {
    console.log('\n📊 DRIVER STRUCTURE FIX SUMMARY:');
    console.log(`✅ Successfully fixed: ${this.fixed.length}`);
    console.log(`❌ Errors encountered: ${this.errors.length}`);
    
    if (this.errors.length > 0) {
      console.log('\n❌ ERRORS:');
      for (const error of this.errors) {
        console.log(`  - ${error}`);
      }
    }
    
    const report = {
      timestamp: new Date().toISOString(),
      fixed: this.fixed,
      errors: this.errors
    };
    
    fs.writeFileSync('./driver_structure_fix_report.json', JSON.stringify(report, null, 2));
    console.log('\n📄 Report saved: driver_structure_fix_report.json');
  }
}

// Run the fix
const fixer = new DriverStructureFixer();
fixer.fixDriverStructure().catch(console.error);
