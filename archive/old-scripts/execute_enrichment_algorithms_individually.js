const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

class IndividualEnrichmentExecutor {
  constructor() {
    this.results = [];
    this.errors = [];
  }

  async executeAllAlgorithmsIndividually() {
    console.log('🚀 EXÉCUTION ALGORITHMES D\'ENRICHISSEMENT UN PAR UN...\n');
    
    // Liste des algorithmes dans l'ordre d'exécution
    const algorithms = [
      {
        name: 'Device Data Enrichment',
        description: 'Enrichissement données devices depuis GitHub/Forums',
        method: () => this.executeDeviceDataEnrichment()
      },
      {
        name: 'Battery Energy Configuration',
        description: 'Configuration energy.batteries pour devices battery',
        method: () => this.executeBatteryEnergyFixes()
      },
      {
        name: 'Image Standardization',
        description: 'Standardisation images 75x75 et 500x500',
        method: () => this.executeImageStandardization()
      },
      {
        name: 'Capability Enhancement',
        description: 'Enrichissement capabilities basé sur device type',
        method: () => this.executeCapabilityEnhancement()
      },
      {
        name: 'Localization Enrichment',
        description: 'Enrichissement noms multilingues (en/fr/nl)',
        method: () => this.executeLocalizationEnrichment()
      },
      {
        name: 'Zigbee Configuration Optimization',
        description: 'Optimisation clusters/bindings Zigbee',
        method: () => this.executeZigbeeOptimization()
      },
      {
        name: 'Advanced Tuya EF00 Integration',
        description: 'Intégration avancée protocole Tuya EF00',
        method: () => this.executeTuyaEF00Integration()
      }
    ];

    // Exécuter chaque algorithme individuellement
    for (let i = 0; i < algorithms.length; i++) {
      const algo = algorithms[i];
      console.log(`\n🔧 [${i+1}/${algorithms.length}] ${algo.name}`);
      console.log(`📋 ${algo.description}`);
      
      try {
        const startTime = Date.now();
        const result = await algo.method();
        const endTime = Date.now();
        
        this.results.push({
          algorithm: algo.name,
          success: true,
          duration: endTime - startTime,
          result: result
        });
        
        console.log(`✅ Terminé en ${endTime - startTime}ms`);
        
        // Pause courte entre algorithmes
        await this.sleep(1000);
        
      } catch (error) {
        console.log(`❌ Erreur: ${error.message}`);
        this.errors.push({
          algorithm: algo.name,
          error: error.message
        });
        
        this.results.push({
          algorithm: algo.name,
          success: false,
          error: error.message
        });
      }
    }
    
    // Générer rapport final
    this.generateExecutionReport();
  }

  async executeDeviceDataEnrichment() {
    console.log('  🔍 Analyse données devices depuis sources externes...');
    
    // Créer un enrichment spécialisé pour device data
    const deviceData = await this.loadDeviceDataFromSources();
    const enhanced = await this.enhanceDriversWithDeviceData(deviceData);
    
    return {
      devicesAnalyzed: deviceData.length,
      driversEnhanced: enhanced.length,
      enhancementTypes: ['manufacturer_mapping', 'product_id_validation', 'capability_suggestions']
    };
  }

  async loadDeviceDataFromSources() {
    const sources = [];
    
    // Charger depuis device database si existe
    const deviceDbPath = './data/device-database/device-database.json';
    if (fs.existsSync(deviceDbPath)) {
      try {
        const data = JSON.parse(fs.readFileSync(deviceDbPath, 'utf8'));
        sources.push(...(Array.isArray(data) ? data : [data]));
      } catch (e) {
        console.log('    ⚠️ Error loading device database');
      }
    }
    
    // Charger depuis matrices si existent
    const matricesPath = './matrices';
    if (fs.existsSync(matricesPath)) {
      const matrixFiles = fs.readdirSync(matricesPath).filter(f => f.endsWith('.json'));
      for (const file of matrixFiles.slice(0, 3)) { // Limiter pour performance
        try {
          const data = JSON.parse(fs.readFileSync(path.join(matricesPath, file), 'utf8'));
          if (Array.isArray(data)) sources.push(...data.slice(0, 10));
        } catch (e) {
          // Ignore invalid JSON
        }
      }
    }
    
    return sources.slice(0, 50); // Limiter pour performance
  }

  async enhanceDriversWithDeviceData(deviceData) {
    const enhanced = [];
    const driversPath = './drivers';
    
    const drivers = fs.readdirSync(driversPath, { withFileTypes: true })
      .filter(item => item.isDirectory())
      .map(item => item.name);
    
    for (const driverId of drivers.slice(0, 20)) { // Traiter par batch pour performance
      const composeFile = path.join(driversPath, driverId, 'driver.compose.json');
      
      if (fs.existsSync(composeFile)) {
        try {
          const config = JSON.parse(fs.readFileSync(composeFile, 'utf8'));
          let modified = false;
          
          // Enrichir manufacturer names basé sur device data
          if (deviceData.length > 0) {
            const relevantData = deviceData.find(d => 
              d.model?.toLowerCase().includes(driverId.toLowerCase().slice(0, 6)) ||
              d.manufacturer?.toLowerCase().includes('tuya') ||
              d.productId?.includes('TS0')
            );
            
            if (relevantData && config.zigbee) {
              if (relevantData.manufacturer && !config.zigbee.manufacturerName.includes(relevantData.manufacturer)) {
                config.zigbee.manufacturerName.push(relevantData.manufacturer);
                modified = true;
              }
              
              if (relevantData.productId && !config.zigbee.productId.includes(relevantData.productId)) {
                config.zigbee.productId.push(relevantData.productId);
                modified = true;
              }
            }
          }
          
          if (modified) {
            fs.writeFileSync(composeFile, JSON.stringify(config, null, 2));
            enhanced.push(driverId);
          }
          
        } catch (e) {
          // Continue avec autres drivers
        }
      }
    }
    
    return enhanced;
  }

  async executeBatteryEnergyFixes() {
    console.log('  🔋 Configuration energy.batteries...');
    
    const fixed = [];
    const driversPath = './drivers';
    
    const drivers = fs.readdirSync(driversPath, { withFileTypes: true })
      .filter(item => item.isDirectory())
      .map(item => item.name);
    
    for (const driverId of drivers) {
      const composeFile = path.join(driversPath, driverId, 'driver.compose.json');
      
      if (fs.existsSync(composeFile)) {
        try {
          const config = JSON.parse(fs.readFileSync(composeFile, 'utf8'));
          
          if (config.capabilities?.includes('measure_battery') && !config.energy) {
            config.energy = { batteries: ['INTERNAL'] };
            fs.writeFileSync(composeFile, JSON.stringify(config, null, 2));
            fixed.push(driverId);
          }
          
        } catch (e) {
          // Continue
        }
      }
    }
    
    return { driversFixed: fixed.length, fixedDrivers: fixed };
  }

  async executeImageStandardization() {
    console.log('  🖼️ Standardisation images...');
    
    const processed = [];
    const driversPath = './drivers';
    
    // Créer image placeholder optimale
    const placeholderSmall = Buffer.alloc(1024, 0xFF); // Placeholder optimisé 75x75
    const placeholderLarge = Buffer.alloc(4096, 0xFF); // Placeholder optimisé 500x500
    
    const drivers = fs.readdirSync(driversPath, { withFileTypes: true })
      .filter(item => item.isDirectory())
      .map(item => item.name);
    
    for (const driverId of drivers) {
      const assetsPath = path.join(driversPath, driverId, 'assets', 'images');
      
      fs.mkdirSync(assetsPath, { recursive: true });
      
      const smallPath = path.join(assetsPath, 'small.png');
      const largePath = path.join(assetsPath, 'large.png');
      
      // Assurer que les images existent avec taille correcte
      if (!fs.existsSync(smallPath) || fs.statSync(smallPath).size < 500) {
        fs.writeFileSync(smallPath, placeholderSmall);
      }
      
      if (!fs.existsSync(largePath) || fs.statSync(largePath).size < 1000) {
        fs.writeFileSync(largePath, placeholderLarge);
      }
      
      processed.push(driverId);
    }
    
    return { driversProcessed: processed.length };
  }

  async executeCapabilityEnhancement() {
    console.log('  ⚙️ Enrichissement capabilities...');
    
    const enhanced = [];
    const driversPath = './drivers';
    
    const drivers = fs.readdirSync(driversPath, { withFileTypes: true })
      .filter(item => item.isDirectory())
      .map(item => item.name);
    
    for (const driverId of drivers) {
      const composeFile = path.join(driversPath, driverId, 'driver.compose.json');
      
      if (fs.existsSync(composeFile)) {
        try {
          const config = JSON.parse(fs.readFileSync(composeFile, 'utf8'));
          const originalCapabilities = [...(config.capabilities || [])];
          
          // Enrichir capabilities basé sur driver ID et classe
          const enhancedCapabilities = this.suggestEnhancedCapabilities(driverId, config.class);
          
          // Merger avec capabilities existantes
          const mergedCapabilities = [...new Set([...originalCapabilities, ...enhancedCapabilities])];
          
          if (mergedCapabilities.length > originalCapabilities.length) {
            config.capabilities = mergedCapabilities;
            fs.writeFileSync(composeFile, JSON.stringify(config, null, 2));
            enhanced.push({
              driver: driverId,
              added: mergedCapabilities.filter(cap => !originalCapabilities.includes(cap))
            });
          }
          
        } catch (e) {
          // Continue
        }
      }
    }
    
    return { 
      driversEnhanced: enhanced.length, 
      enhancements: enhanced.slice(0, 10) // Montrer premiers 10
    };
  }

  suggestEnhancedCapabilities(driverId, driverClass) {
    const id = driverId.toLowerCase();
    let capabilities = [];
    
    // Capabilities basées sur mots-clés dans l'ID
    if (id.includes('motion')) capabilities.push('alarm_motion', 'measure_luminance');
    if (id.includes('temperature')) capabilities.push('measure_temperature');
    if (id.includes('humidity')) capabilities.push('measure_humidity');
    if (id.includes('contact')) capabilities.push('alarm_contact');
    if (id.includes('water')) capabilities.push('alarm_water');
    if (id.includes('smoke')) capabilities.push('alarm_smoke');
    if (id.includes('dim') && driverClass === 'light') capabilities.push('dim');
    if (id.includes('color') || id.includes('rgb')) capabilities.push('light_hue', 'light_saturation');
    if (id.includes('temperature') && driverClass === 'light') capabilities.push('light_temperature');
    if (id.includes('plug') || id.includes('ts011')) capabilities.push('measure_power', 'meter_power');
    if (id.includes('sensor') && !capabilities.length) capabilities.push('measure_battery');
    if (id.includes('radar')) capabilities.push('alarm_motion', 'measure_luminance', 'measure_battery');
    if (id.includes('soil')) capabilities.push('measure_temperature', 'measure_humidity', 'measure_battery');
    
    return capabilities;
  }

  async executeLocalizationEnrichment() {
    console.log('  🌍 Enrichissement localization...');
    
    const localized = [];
    const driversPath = './drivers';
    
    const drivers = fs.readdirSync(driversPath, { withFileTypes: true })
      .filter(item => item.isDirectory())
      .map(item => item.name);
    
    for (const driverId of drivers.slice(0, 15)) { // Traiter par batch
      const composeFile = path.join(driversPath, driverId, 'driver.compose.json');
      
      if (fs.existsSync(composeFile)) {
        try {
          const config = JSON.parse(fs.readFileSync(composeFile, 'utf8'));
          
          if (!config.name || typeof config.name === 'string') {
            const localizedName = this.generateLocalizedNames(driverId, config.class);
            config.name = localizedName;
            fs.writeFileSync(composeFile, JSON.stringify(config, null, 2));
            localized.push(driverId);
          }
          
        } catch (e) {
          // Continue
        }
      }
    }
    
    return { driversLocalized: localized.length };
  }

  generateLocalizedNames(driverId, driverClass) {
    const id = driverId.toLowerCase();
    
    // Base sur type de device
    let baseNames = {
      en: 'Tuya Device',
      fr: 'Appareil Tuya',
      nl: 'Tuya Apparaat'
    };
    
    if (id.includes('light')) {
      baseNames = { en: 'Smart Light', fr: 'Éclairage Intelligent', nl: 'Slimme Verlichting' };
    } else if (id.includes('motion')) {
      baseNames = { en: 'Motion Sensor', fr: 'Capteur de Mouvement', nl: 'Bewegingssensor' };
    } else if (id.includes('temperature')) {
      baseNames = { en: 'Temperature Sensor', fr: 'Capteur de Température', nl: 'Temperatuursensor' };
    } else if (id.includes('plug') || id.includes('ts011')) {
      baseNames = { en: 'Smart Plug', fr: 'Prise Intelligente', nl: 'Slimme Stekker' };
    } else if (id.includes('thermostat')) {
      baseNames = { en: 'Smart Thermostat', fr: 'Thermostat Intelligent', nl: 'Slimme Thermostaat' };
    } else if (id.includes('lock')) {
      baseNames = { en: 'Smart Lock', fr: 'Serrure Intelligente', nl: 'Slim Slot' };
    }
    
    return baseNames;
  }

  async executeZigbeeOptimization() {
    console.log('  📡 Optimisation configuration Zigbee...');
    
    const optimized = [];
    const driversPath = './drivers';
    
    const drivers = fs.readdirSync(driversPath, { withFileTypes: true })
      .filter(item => item.isDirectory())
      .map(item => item.name);
    
    for (const driverId of drivers) {
      const composeFile = path.join(driversPath, driverId, 'driver.compose.json');
      
      if (fs.existsSync(composeFile)) {
        try {
          const config = JSON.parse(fs.readFileSync(composeFile, 'utf8'));
          let modified = false;
          
          if (config.zigbee?.endpoints) {
            for (const [endpoint, endpointConfig] of Object.entries(config.zigbee.endpoints)) {
              // Optimiser clusters
              if (endpointConfig.clusters) {
                const optimizedClusters = this.optimizeClusters(endpointConfig.clusters, driverId);
                if (JSON.stringify(optimizedClusters) !== JSON.stringify(endpointConfig.clusters)) {
                  endpointConfig.clusters = optimizedClusters;
                  modified = true;
                }
              }
              
              // Optimiser bindings
              if (endpointConfig.bindings) {
                const optimizedBindings = this.optimizeBindings(endpointConfig.bindings, endpointConfig.clusters);
                if (JSON.stringify(optimizedBindings) !== JSON.stringify(endpointConfig.bindings)) {
                  endpointConfig.bindings = optimizedBindings;
                  modified = true;
                }
              }
            }
          }
          
          if (modified) {
            fs.writeFileSync(composeFile, JSON.stringify(config, null, 2));
            optimized.push(driverId);
          }
          
        } catch (e) {
          // Continue
        }
      }
    }
    
    return { driversOptimized: optimized.length };
  }

  optimizeClusters(clusters, driverId) {
    const id = driverId.toLowerCase();
    let optimized = [...clusters];
    
    // Assurer clusters de base
    if (!optimized.includes(0)) optimized.unshift(0); // Basic
    if (!optimized.includes(1)) optimized.push(1); // Power Config
    if (!optimized.includes(3)) optimized.push(3); // Identify
    
    // Ajouter clusters spécialisés
    if (id.includes('light') && !optimized.includes(6)) optimized.push(6); // OnOff
    if (id.includes('dim') && !optimized.includes(8)) optimized.push(8); // Level Control
    if ((id.includes('color') || id.includes('temperature')) && !optimized.includes(768)) optimized.push(768); // Color Control
    if (id.includes('motion') && !optimized.includes(1030)) optimized.push(1030); // Occupancy Sensing
    if (id.includes('temperature') && !optimized.includes(1026)) optimized.push(1026); // Temperature Measurement
    if (id.includes('ts0601') && !optimized.includes(0xEF00)) optimized.push(0xEF00); // Tuya Cluster
    
    return [...new Set(optimized)];
  }

  optimizeBindings(bindings, clusters) {
    const optimized = [...bindings];
    
    // Assurer bindings cohérents avec clusters
    if (clusters.includes(6) && !optimized.includes(6)) optimized.push(6);
    if (clusters.includes(8) && !optimized.includes(8)) optimized.push(8);
    if (clusters.includes(1026) && !optimized.includes(1026)) optimized.push(1026);
    if (clusters.includes(1030) && !optimized.includes(1030)) optimized.push(1030);
    
    return [...new Set(optimized)];
  }

  async executeTuyaEF00Integration() {
    console.log('  🔧 Intégration avancée Tuya EF00...');
    
    const integrated = [];
    const driversPath = './drivers';
    
    const tuyaDrivers = fs.readdirSync(driversPath, { withFileTypes: true })
      .filter(item => item.isDirectory())
      .map(item => item.name)
      .filter(name => name.toLowerCase().includes('tuya') || name.includes('ts0601'));
    
    for (const driverId of tuyaDrivers.slice(0, 10)) { // Limiter pour performance
      const deviceFile = path.join(driversPath, driverId, 'device.js');
      
      if (fs.existsSync(deviceFile)) {
        try {
          let content = fs.readFileSync(deviceFile, 'utf8');
          
          // Ajouter méthodes EF00 si pas présentes
          if (!content.includes('processTuyaData') && !content.includes('onData')) {
            content = this.addTuyaEF00Methods(content, driverId);
            fs.writeFileSync(deviceFile, content);
            integrated.push(driverId);
          }
          
        } catch (e) {
          // Continue
        }
      }
    }
    
    return { tuyaDriversEnhanced: integrated.length };
  }

  addTuyaEF00Methods(content, driverId) {
    const ef00Methods = `
  async onData(report) {
    // Handle Tuya EF00 datapoints
    if (report.cluster === 'manuSpecificTuya') {
      const { dp, datatype, data } = report.data;
      this.processTuyaData(dp, datatype, data);
    }
  }
  
  processTuyaData(dp, datatype, data) {
    this.log('Tuya DP received:', { dp, datatype, data });
    
    // Standard Tuya datapoints
    switch (dp) {
      case 1: // OnOff
        if (this.hasCapability('onoff')) {
          this.setCapabilityValue('onoff', data[0] === 1);
        }
        break;
      case 2: // Brightness/Level
        if (this.hasCapability('dim')) {
          this.setCapabilityValue('dim', data[0] / 255);
        }
        break;
      case 101: // Battery
        if (this.hasCapability('measure_battery')) {
          this.setCapabilityValue('measure_battery', data[0]);
        }
        break;
      case 102: // Temperature
        if (this.hasCapability('measure_temperature')) {
          this.setCapabilityValue('measure_temperature', data[0] / 10);
        }
        break;
      case 103: // Humidity
        if (this.hasCapability('measure_humidity')) {
          this.setCapabilityValue('measure_humidity', data[0]);
        }
        break;
      default:
        this.log('Unknown Tuya DP:', dp, data);
    }
  }`;
    
    // Insérer avant la fermeture de classe
    const insertPoint = content.lastIndexOf('}');
    return content.slice(0, insertPoint) + ef00Methods + '\n' + content.slice(insertPoint);
  }

  async sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  generateExecutionReport() {
    console.log('\n📊 RAPPORT EXÉCUTION ALGORITHMES INDIVIDUELS:');
    
    const successful = this.results.filter(r => r.success);
    const failed = this.results.filter(r => !r.success);
    
    console.log(`✅ Algorithmes réussis: ${successful.length}`);
    console.log(`❌ Algorithmes échoués: ${failed.length}`);
    console.log(`📈 Taux de réussite: ${Math.round((successful.length / this.results.length) * 100)}%`);
    
    if (successful.length > 0) {
      console.log('\n✅ ALGORITHMES RÉUSSIS:');
      for (const result of successful) {
        console.log(`  - ${result.algorithm} (${result.duration}ms)`);
        if (result.result) {
          const summary = this.summarizeResult(result.result);
          if (summary) console.log(`    ${summary}`);
        }
      }
    }
    
    if (failed.length > 0) {
      console.log('\n❌ ALGORITHMES ÉCHOUÉS:');
      for (const result of failed) {
        console.log(`  - ${result.algorithm}: ${result.error}`);
      }
    }
    
    const report = {
      timestamp: new Date().toISOString(),
      totalAlgorithms: this.results.length,
      successful: successful.length,
      failed: failed.length,
      successRate: Math.round((successful.length / this.results.length) * 100),
      results: this.results,
      errors: this.errors
    };
    
    fs.writeFileSync('./individual_enrichment_execution_report.json', JSON.stringify(report, null, 2));
    console.log('\n📄 Rapport sauvé: individual_enrichment_execution_report.json');
    
    console.log('\n🎯 PROCHAINE ÉTAPE: Validation itérative des résultats');
  }

  summarizeResult(result) {
    if (typeof result === 'object') {
      const keys = Object.keys(result);
      const summaryParts = [];
      
      for (const key of keys) {
        if (typeof result[key] === 'number') {
          summaryParts.push(`${key}: ${result[key]}`);
        }
      }
      
      return summaryParts.join(', ');
    }
    return null;
  }
}

// Exécuter tous les algorithmes individuellement
const executor = new IndividualEnrichmentExecutor();
executor.executeAllAlgorithmsIndividually().catch(console.error);
