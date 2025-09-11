const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

class EnrichmentEngine {
  constructor() {
    this.results = [];
    this.errors = [];
    this.algorithms = [
      'analyze-device-data.js',
      'fix_battery_energy.js', 
      'fix_all_missing_images.js'
    ];
  }

  async runAllEnrichmentAlgorithms() {
    console.log('🚀 Running All Enrichment Algorithms...\n');
    
    // 1. Device data enrichment
    await this.runDeviceDataEnrichment();
    
    // 2. Battery energy configuration fixes
    await this.runBatteryEnergyFixes();
    
    // 3. Image standardization
    await this.runImageStandardization();
    
    // 4. Driver capability enhancement
    await this.runCapabilityEnhancement();
    
    // 5. Localization enrichment  
    await this.runLocalizationEnrichment();
    
    // 6. Zigbee configuration optimization
    await this.runZigbeeOptimization();
    
    // 7. Generate enrichment report
    this.generateEnrichmentReport();
    
    console.log('✅ All enrichment algorithms completed!');
  }

  async runDeviceDataEnrichment() {
    console.log('📊 Running device data enrichment...');
    
    if (fs.existsSync('./scripts/analysis/analyze-device-data.js')) {
      try {
        execSync('node ./scripts/analysis/analyze-device-data.js', { 
          stdio: 'inherit',
          cwd: process.cwd()
        });
        this.results.push('Device data enrichment completed successfully');
      } catch (error) {
        this.errors.push(`Device data enrichment failed: ${error.message}`);
        console.log('⚠️ Device data enrichment script not available, creating enhanced version...');
        await this.createEnhancedDeviceDataScript();
      }
    } else {
      await this.createEnhancedDeviceDataScript();
    }
  }

  async createEnhancedDeviceDataScript() {
    const script = `
const fs = require('fs');
const path = require('path');

// Enhanced device data enrichment
const deviceDatabase = {
  sensors: {
    'TS0601_motion': {
      capabilities: ['alarm_motion', 'measure_luminance', 'measure_battery'],
      clusters: [0, 1, 0xEF00],
      dataPoints: {1: 'motion', 2: 'battery', 3: 'luminance'}
    },
    'TS0201': {
      capabilities: ['measure_temperature', 'measure_humidity', 'measure_battery'],
      clusters: [0, 1, 1026, 1029],
      dataPoints: {1: 'temperature', 2: 'humidity', 3: 'battery'}
    }
  },
  lights: {
    'TS0501A': {
      capabilities: ['onoff', 'dim'],
      clusters: [0, 3, 4, 5, 6, 8],
      colorTemp: false
    },
    'TS0502A': {
      capabilities: ['onoff', 'dim', 'light_temperature'],
      clusters: [0, 3, 4, 5, 6, 8, 768],
      colorTemp: true
    }
  },
  switches: {
    'TS011F': {
      capabilities: ['onoff', 'measure_power', 'meter_power'],
      clusters: [0, 3, 4, 5, 6, 1794, 2820],
      metering: true
    }
  }
};

// Apply enrichment to all drivers
const driversPath = './drivers';
const categories = fs.readdirSync(driversPath);

for (const category of categories) {
  const categoryPath = path.join(driversPath, category);
  if (!fs.statSync(categoryPath).isDirectory()) continue;
  
  const drivers = fs.readdirSync(categoryPath);
  
  for (const driverId of drivers) {
    const driverPath = path.join(categoryPath, driverId);
    const composeFile = path.join(driverPath, 'driver.compose.json');
    
    if (fs.existsSync(composeFile)) {
      const config = JSON.parse(fs.readFileSync(composeFile, 'utf8'));
      
      // Enrich based on device database
      let enriched = false;
      
      for (const [deviceCategory, devices] of Object.entries(deviceDatabase)) {
        for (const [deviceModel, deviceInfo] of Object.entries(devices)) {
          if (driverId.includes(deviceModel) || config.zigbee?.productId?.some(pid => pid.includes(deviceModel))) {
            // Apply enrichment
            config.capabilities = [...new Set([...(config.capabilities || []), ...deviceInfo.capabilities])];
            
            if (config.zigbee?.endpoints?.['1']?.clusters) {
              config.zigbee.endpoints['1'].clusters = [...new Set([...config.zigbee.endpoints['1'].clusters, ...deviceInfo.clusters])];
            }
            
            enriched = true;
            break;
          }
        }
        if (enriched) break;
      }
      
      if (enriched) {
        fs.writeFileSync(composeFile, JSON.stringify(config, null, 2));
        console.log(\`Enriched: \${driverId}\`);
      }
    }
  }
}

console.log('Device data enrichment completed');
`;
    
    fs.writeFileSync('./enhanced_device_enrichment.js', script);
    
    try {
      execSync('node ./enhanced_device_enrichment.js', { 
        stdio: 'inherit',
        cwd: process.cwd()
      });
      this.results.push('Enhanced device data enrichment completed');
    } catch (error) {
      this.errors.push(`Enhanced device enrichment failed: ${error.message}`);
    }
  }

  async runBatteryEnergyFixes() {
    console.log('🔋 Running battery energy fixes...');
    
    if (fs.existsSync('./fix_battery_energy.js')) {
      try {
        execSync('node ./fix_battery_energy.js', { 
          stdio: 'inherit',
          cwd: process.cwd()
        });
        this.results.push('Battery energy fixes completed');
      } catch (error) {
        this.errors.push(`Battery energy fixes failed: ${error.message}`);
      }
    } else {
      console.log('⚠️ Battery energy fix script not found, creating...');
      await this.createBatteryEnergyFixScript();
    }
  }

  async createBatteryEnergyFixScript() {
    const script = `
const fs = require('fs');
const path = require('path');

function fixBatteryEnergy(dir) {
  const items = fs.readdirSync(dir, { withFileTypes: true });
  
  for (const item of items) {
    const fullPath = path.join(dir, item.name);
    
    if (item.isDirectory()) {
      fixBatteryEnergy(fullPath);
    } else if (item.name === 'driver.compose.json') {
      try {
        const content = fs.readFileSync(fullPath, 'utf8');
        const json = JSON.parse(content);
        
        if (json.capabilities && json.capabilities.includes('measure_battery') && !json.energy) {
          json.energy = {
            batteries: ["INTERNAL"]
          };
          
          fs.writeFileSync(fullPath, JSON.stringify(json, null, 2));
          console.log(\`Fixed battery energy: \${fullPath}\`);
        }
      } catch (error) {
        console.error(\`Error processing \${fullPath}:\`, error.message);
      }
    }
  }
}

fixBatteryEnergy('./drivers');
console.log('Battery energy fixes completed');
`;
    
    fs.writeFileSync('./fix_battery_energy.js', script);
    
    try {
      execSync('node ./fix_battery_energy.js', { 
        stdio: 'inherit',
        cwd: process.cwd()
      });
      this.results.push('Battery energy fixes completed');
    } catch (error) {
      this.errors.push(`Battery energy fixes failed: ${error.message}`);
    }
  }

  async runImageStandardization() {
    console.log('🖼️ Running image standardization...');
    
    if (fs.existsSync('./fix_all_missing_images.js')) {
      try {
        execSync('node ./fix_all_missing_images.js', { 
          stdio: 'inherit',
          cwd: process.cwd()
        });
        this.results.push('Image standardization completed');
      } catch (error) {
        this.errors.push(`Image standardization failed: ${error.message}`);
      }
    } else {
      console.log('⚠️ Image standardization script not found, running direct fix...');
      await this.runDirectImageFix();
    }
  }

  async runDirectImageFix() {
    const driversPath = './drivers';
    const categories = fs.readdirSync(driversPath);
    let fixed = 0;
    
    for (const category of categories) {
      const categoryPath = path.join(driversPath, category);
      if (!fs.statSync(categoryPath).isDirectory()) continue;
      
      const drivers = fs.readdirSync(categoryPath);
      
      for (const driverId of drivers) {
        const driverPath = path.join(categoryPath, driverId);
        const assetsPath = path.join(driverPath, 'assets', 'images');
        
        // Ensure images directory exists
        fs.mkdirSync(assetsPath, { recursive: true });
        
        const smallPath = path.join(assetsPath, 'small.png');
        const largePath = path.join(assetsPath, 'large.png');
        
        // Copy standard images if missing
        if (!fs.existsSync(smallPath) && fs.existsSync('./assets/images/small.png')) {
          fs.copyFileSync('./assets/images/small.png', smallPath);
          fixed++;
        }
        
        if (!fs.existsSync(largePath) && fs.existsSync('./assets/images/large.png')) {
          fs.copyFileSync('./assets/images/large.png', largePath);
          fixed++;
        }
        
        // Update driver.compose.json images property
        const composeFile = path.join(driverPath, 'driver.compose.json');
        if (fs.existsSync(composeFile)) {
          try {
            const config = JSON.parse(fs.readFileSync(composeFile, 'utf8'));
            if (!config.images) {
              config.images = {
                small: "{{driverAssetsPath}}/images/small.png",
                large: "{{driverAssetsPath}}/images/large.png"
              };
              fs.writeFileSync(composeFile, JSON.stringify(config, null, 2));
              fixed++;
            }
          } catch (error) {
            // Skip invalid JSON files
          }
        }
      }
    }
    
    console.log(`Direct image fix completed: ${fixed} fixes applied`);
    this.results.push(`Direct image standardization: ${fixed} fixes applied`);
  }

  async runCapabilityEnhancement() {
    console.log('⚙️ Running capability enhancement...');
    
    const capabilityMappings = {
      motion: ['alarm_motion', 'measure_luminance'],
      temperature: ['measure_temperature', 'measure_humidity'],
      contact: ['alarm_contact'],
      switch: ['onoff'],
      plug: ['onoff', 'measure_power', 'meter_power'],
      light: ['onoff', 'dim'],
      thermostat: ['target_temperature', 'measure_temperature'],
      lock: ['locked'],
      smoke: ['alarm_smoke'],
      water: ['alarm_water'],
      leak: ['alarm_water']
    };
    
    const driversPath = './drivers';
    const categories = fs.readdirSync(driversPath);
    let enhanced = 0;
    
    for (const category of categories) {
      const categoryPath = path.join(driversPath, category);
      if (!fs.statSync(categoryPath).isDirectory()) continue;
      
      const drivers = fs.readdirSync(categoryPath);
      
      for (const driverId of drivers) {
        const driverPath = path.join(categoryPath, driverId);
        const composeFile = path.join(driverPath, 'driver.compose.json');
        
        if (fs.existsSync(composeFile)) {
          try {
            const config = JSON.parse(fs.readFileSync(composeFile, 'utf8'));
            
            // Enhance capabilities based on driver ID keywords
            let capabilities = config.capabilities || [];
            let needsUpdate = false;
            
            for (const [keyword, caps] of Object.entries(capabilityMappings)) {
              if (driverId.toLowerCase().includes(keyword)) {
                for (const cap of caps) {
                  if (!capabilities.includes(cap)) {
                    capabilities.push(cap);
                    needsUpdate = true;
                  }
                }
              }
            }
            
            // Add battery capability for sensors
            if (category === 'sensor' && !capabilities.includes('measure_battery')) {
              capabilities.push('measure_battery');
              needsUpdate = true;
            }
            
            if (needsUpdate) {
              config.capabilities = capabilities;
              
              // Add energy config for battery devices
              if (capabilities.includes('measure_battery') && !config.energy) {
                config.energy = { batteries: ['INTERNAL'] };
              }
              
              fs.writeFileSync(composeFile, JSON.stringify(config, null, 2));
              enhanced++;
              console.log(`Enhanced capabilities: ${driverId}`);
            }
            
          } catch (error) {
            // Skip invalid JSON files
          }
        }
      }
    }
    
    console.log(`Capability enhancement completed: ${enhanced} drivers enhanced`);
    this.results.push(`Capability enhancement: ${enhanced} drivers enhanced`);
  }

  async runLocalizationEnrichment() {
    console.log('🌍 Running localization enrichment...');
    
    const translations = {
      en: {
        motion: 'Motion Sensor',
        temperature: 'Temperature Sensor', 
        contact: 'Contact Sensor',
        switch: 'Smart Switch',
        plug: 'Smart Plug',
        light: 'Smart Light',
        thermostat: 'Smart Thermostat',
        lock: 'Smart Lock',
        smoke: 'Smoke Detector',
        water: 'Water Sensor'
      },
      fr: {
        motion: 'Capteur de Mouvement',
        temperature: 'Capteur de Température',
        contact: 'Capteur de Contact', 
        switch: 'Interrupteur Intelligent',
        plug: 'Prise Intelligente',
        light: 'Éclairage Intelligent',
        thermostat: 'Thermostat Intelligent',
        lock: 'Serrure Intelligente',
        smoke: 'Détecteur de Fumée',
        water: 'Capteur d\'Eau'
      },
      nl: {
        motion: 'Bewegingssensor',
        temperature: 'Temperatuursensor',
        contact: 'Contactsensor',
        switch: 'Slimme Schakelaar', 
        plug: 'Slimme Stekker',
        light: 'Slimme Verlichting',
        thermostat: 'Slimme Thermostaat',
        lock: 'Slim Slot',
        smoke: 'Rookmelder',
        water: 'Watersensor'
      }
    };
    
    const driversPath = './drivers';
    const categories = fs.readdirSync(driversPath);
    let localized = 0;
    
    for (const category of categories) {
      const categoryPath = path.join(driversPath, category);
      if (!fs.statSync(categoryPath).isDirectory()) continue;
      
      const drivers = fs.readdirSync(categoryPath);
      
      for (const driverId of drivers) {
        const driverPath = path.join(categoryPath, driverId);
        const composeFile = path.join(driverPath, 'driver.compose.json');
        
        if (fs.existsSync(composeFile)) {
          try {
            const config = JSON.parse(fs.readFileSync(composeFile, 'utf8'));
            
            // Add multilingual names if missing
            if (!config.name || typeof config.name === 'string') {
              let deviceType = 'device';
              
              // Detect device type from ID
              for (const type of Object.keys(translations.en)) {
                if (driverId.toLowerCase().includes(type)) {
                  deviceType = type;
                  break;
                }
              }
              
              config.name = {
                en: translations.en[deviceType] || `Tuya ${driverId}`,
                fr: translations.fr[deviceType] || `Tuya ${driverId}`,
                nl: translations.nl[deviceType] || `Tuya ${driverId}`
              };
              
              fs.writeFileSync(composeFile, JSON.stringify(config, null, 2));
              localized++;
            }
            
          } catch (error) {
            // Skip invalid JSON files
          }
        }
      }
    }
    
    console.log(`Localization enrichment completed: ${localized} drivers localized`);
    this.results.push(`Localization enrichment: ${localized} drivers localized`);
  }

  async runZigbeeOptimization() {
    console.log('📡 Running Zigbee configuration optimization...');
    
    const standardClusters = {
      basic: 0,
      power: 1, 
      identify: 3,
      groups: 4,
      scenes: 5,
      onOff: 6,
      levelControl: 8,
      colorControl: 768,
      temperatureMeasurement: 1026,
      relativeHumidity: 1029,
      occupancySensing: 1030,
      electricalMeasurement: 2820,
      tuya: 0xEF00
    };
    
    const driversPath = './drivers';
    const categories = fs.readdirSync(driversPath);
    let optimized = 0;
    
    for (const category of categories) {
      const categoryPath = path.join(driversPath, category);
      if (!fs.statSync(categoryPath).isDirectory()) continue;
      
      const drivers = fs.readdirSync(categoryPath);
      
      for (const driverId of drivers) {
        const driverPath = path.join(categoryPath, driverId);
        const composeFile = path.join(driverPath, 'driver.compose.json');
        
        if (fs.existsSync(composeFile)) {
          try {
            const config = JSON.parse(fs.readFileSync(composeFile, 'utf8'));
            
            if (config.zigbee?.endpoints) {
              let needsUpdate = false;
              
              for (const [endpoint, endpointConfig] of Object.entries(config.zigbee.endpoints)) {
                // Ensure clusters are numbers
                if (endpointConfig.clusters) {
                  const newClusters = endpointConfig.clusters.map(cluster => {
                    if (typeof cluster === 'string' && cluster.startsWith('0x')) {
                      return parseInt(cluster, 16);
                    }
                    return typeof cluster === 'number' ? cluster : parseInt(cluster, 10);
                  });
                  
                  if (JSON.stringify(newClusters) !== JSON.stringify(endpointConfig.clusters)) {
                    endpointConfig.clusters = newClusters;
                    needsUpdate = true;
                  }
                }
                
                // Ensure bindings are numbers  
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
                    needsUpdate = true;
                  }
                }
              }
              
              if (needsUpdate) {
                fs.writeFileSync(composeFile, JSON.stringify(config, null, 2));
                optimized++;
              }
            }
            
          } catch (error) {
            // Skip invalid JSON files
          }
        }
      }
    }
    
    console.log(`Zigbee optimization completed: ${optimized} drivers optimized`);
    this.results.push(`Zigbee optimization: ${optimized} drivers optimized`);
  }

  generateEnrichmentReport() {
    const report = {
      timestamp: new Date().toISOString(),
      summary: {
        algorithmsRun: this.algorithms.length + 4, // +4 for the additional algorithms we created
        successfulResults: this.results.length,
        errors: this.errors.length
      },
      results: this.results,
      errors: this.errors,
      algorithms: [
        ...this.algorithms,
        'capability_enhancement',
        'localization_enrichment', 
        'zigbee_optimization',
        'enhanced_device_enrichment'
      ]
    };
    
    fs.writeFileSync('./enrichment_report.json', JSON.stringify(report, null, 2));
    
    console.log('\n📊 ENRICHMENT SUMMARY:');
    console.log(`🚀 Algorithms executed: ${report.summary.algorithmsRun}`);
    console.log(`✅ Successful results: ${report.summary.successfulResults}`);
    console.log(`❌ Errors encountered: ${report.summary.errors}`);
    console.log('\n📄 Detailed report: enrichment_report.json');
  }
}

// Run all enrichment algorithms
const engine = new EnrichmentEngine();
engine.runAllEnrichmentAlgorithms().catch(console.error);
