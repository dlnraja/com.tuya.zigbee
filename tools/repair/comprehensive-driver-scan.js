#!/usr/bin/env node

console.log('🔍 SCAN COMPLET DES DRIVERS - NOUVELLE ARCHITECTURE');
console.log('===================================================');

const fs = require('fs');
const path = require('path');

class ComprehensiveDriverScanner {
  constructor() {
    this.driversDir = path.join(__dirname, '../../drivers');
    this.researchDir = path.join(__dirname, '../../research');
    this.currentDrivers = [];
    this.expectedDrivers = [
      'zigbee-tuya-universal',
      'tuya-plug-universal',
      'tuya-light-universal',
      'tuya-cover-universal',
      'tuya-climate-universal',
      'tuya-sensor-universal',
      'tuya-remote-universal',
      'fan-tuya-universal',
      'lock-tuya-universal'
    ];
    
    this.sourceCategories = {
      'Zigbee2MQTT': ['lights', 'sensors', 'switches', 'covers', 'plugs', 'thermostats'],
      'Blakadder': ['motion', 'temperature', 'humidity', 'door', 'water', 'smoke'],
      'Homey Forums': ['community', 'user_reports', 'compatibility', 'issues'],
      'Tuya Developer': ['official_specs', 'clusters', 'capabilities', 'firmware'],
      'Home Assistant': ['integrations', 'device_traits', 'automation', 'templates']
    };
    
    this.deviceTypes = {
      'light': ['bulb', 'strip', 'panel', 'ceiling', 'wall', 'outdoor'],
      'sensor': ['temperature', 'humidity', 'motion', 'door', 'water', 'smoke', 'gas', 'vibration'],
      'switch': ['wall', 'remote', 'smart', 'dimmer', 'relay'],
      'cover': ['blind', 'curtain', 'shutter', 'garage', 'awning'],
      'climate': ['thermostat', 'valve', 'controller', 'fan'],
      'lock': ['smart_lock', 'keypad', 'deadbolt', 'mortise'],
      'plug': ['indoor', 'outdoor', 'power_strip', 'usb'],
      'remote': ['scene', 'button', 'keyfob', 'touch'],
      'fan': ['ceiling', 'table', 'wall', 'exhaust', 'bathroom']
    };
  }
  
  async runComprehensiveScan() {
    try {
      console.log('🚀 Début du scan complet...\n');
      
      // 1. Scanner les drivers actuels
      await this.scanCurrentDrivers();
      
      // 2. Analyser les sources externes
      await this.analyzeExternalSources();
      
      // 3. Vérifier la couverture des types de devices
      await this.checkDeviceTypeCoverage();
      
      // 4. Analyser les matrices existantes
      await this.analyzeExistingMatrices();
      
      // 5. Générer le rapport complet
      await this.generateComprehensiveReport();
      
      console.log('✅ Scan complet terminé avec succès !');
      console.log('::END::COMPREHENSIVE_SCAN::OK');
      
    } catch (error) {
      console.error('❌ Erreur lors du scan:', error.message);
      console.log('::END::COMPREHENSIVE_SCAN::FAIL');
      process.exit(1);
    }
  }
  
  async scanCurrentDrivers() {
    console.log('📁 SCAN DES DRIVERS ACTUELS');
    console.log('-----------------------------');
    
    this.currentDrivers = [];
    
    for (const driverId of this.expectedDrivers) {
      const driverPath = path.join(this.driversDir, driverId);
      
      if (fs.existsSync(driverPath)) {
        const driverInfo = await this.analyzeDriver(driverId, driverPath);
        this.currentDrivers.push(driverInfo);
        console.log(`✅ ${driverId} - ${driverInfo.status}`);
      } else {
        console.log(`❌ ${driverId} - MANQUANT`);
        this.currentDrivers.push({
          id: driverId,
          status: 'MISSING',
          path: driverPath,
          files: [],
          capabilities: [],
          issues: ['Driver directory missing']
        });
      }
    }
    
    console.log(`\n📊 Drivers actuels: ${this.currentDrivers.filter(d => d.status === 'COMPLETE').length}/${this.expectedDrivers.length} complets\n`);
  }
  
  async analyzeDriver(driverId, driverPath) {
    const files = fs.readdirSync(driverPath);
    const hasCompose = files.includes('driver.compose.json');
    const hasDevice = files.includes('device.js');
    const hasAssets = fs.existsSync(path.join(driverPath, 'assets')) && fs.readdirSync(path.join(driverPath, 'assets')).length > 0;
    const hasFlow = fs.existsSync(path.join(driverPath, 'flow')) && fs.readdirSync(path.join(driverPath, 'flow')).length > 0;
    
    let status = 'COMPLETE';
    let issues = [];
    
    if (!hasCompose) {
      status = 'INCOMPLETE';
      issues.push('driver.compose.json missing');
    }
    if (!hasDevice) {
      status = 'INCOMPLETE';
      issues.push('device.js missing');
    }
    if (!hasAssets) {
      status = 'INCOMPLETE';
      issues.push('assets incomplete');
    }
    if (!hasFlow) {
      status = 'INCOMPLETE';
      issues.push('flow cards missing');
    }
    
    let capabilities = [];
    let clusters = [];
    
    if (hasCompose) {
      try {
        const composePath = path.join(driverPath, 'driver.compose.json');
        const composeData = JSON.parse(fs.readFileSync(composePath, 'utf8'));
        capabilities = composeData.capabilities || [];
        clusters = composeData.zigbee?.clusters || [];
      } catch (error) {
        issues.push(`Error parsing driver.compose.json: ${error.message}`);
      }
    }
    
    return {
      id: driverId,
      status,
      path: driverPath,
      files: files,
      capabilities,
      clusters,
      issues,
      hasCompose,
      hasDevice,
      hasAssets,
      hasFlow
    };
  }
  
  async analyzeExternalSources() {
    console.log('🌐 ANALYSE DES SOURCES EXTERNES');
    console.log('--------------------------------');
    
    const sources = ['zigbee2mqtt', 'blakadder', 'homey-forums', 'tuya-developer', 'home-assistant'];
    
    for (const source of sources) {
      const sourcePath = path.join(this.researchDir, 'source-data', `${source}.json`);
      
      if (fs.existsSync(sourcePath)) {
        try {
          const sourceData = JSON.parse(fs.readFileSync(sourcePath, 'utf8'));
          console.log(`✅ ${source} - ${sourceData.devices?.length || 0} devices, ${sourceData.issues?.length || 0} issues`);
          
          // Analyser les types de devices trouvés
          if (sourceData.devices) {
            const deviceTypes = this.analyzeDeviceTypes(sourceData.devices);
            console.log(`   Types: ${Object.keys(deviceTypes).join(', ')}`);
          }
          
        } catch (error) {
          console.log(`❌ ${source} - Erreur parsing: ${error.message}`);
        }
      } else {
        console.log(`⚠️ ${source} - Fichier non trouvé`);
      }
    }
    console.log('');
  }
  
  analyzeDeviceTypes(devices) {
    const types = {};
    
    devices.forEach(device => {
      const type = device.type || device.category || 'unknown';
      types[type] = (types[type] || 0) + 1;
    });
    
    return types;
  }
  
  async checkDeviceTypeCoverage() {
    console.log('🎯 VÉRIFICATION DE LA COUVERTURE DES TYPES DE DEVICES');
    console.log('-----------------------------------------------------');
    
    let totalCoverage = 0;
    let coveredTypes = 0;
    
    for (const [category, types] of Object.entries(this.deviceTypes)) {
      const categoryDrivers = this.currentDrivers.filter(d => 
        d.id.includes(category) || d.id.includes('universal')
      );
      
      if (categoryDrivers.length > 0) {
        const driver = categoryDrivers[0];
        const coverage = this.calculateTypeCoverage(category, types, driver);
        totalCoverage += coverage;
        coveredTypes++;
        
        console.log(`✅ ${category}: ${coverage.toFixed(1)}% couvert (${types.length} types)`);
      } else {
        console.log(`❌ ${category}: Non couvert (${types.length} types manquants)`);
      }
    }
    
    const overallCoverage = totalCoverage / Math.max(coveredTypes, 1);
    console.log(`\n📊 Couverture globale: ${overallCoverage.toFixed(1)}%\n`);
  }
  
  calculateTypeCoverage(category, types, driver) {
    if (!driver.capabilities || driver.capabilities.length === 0) {
      return 0;
    }
    
    // Logique de calcul de couverture basée sur les capacités
    let coveredTypes = 0;
    
    types.forEach(type => {
      if (this.isTypeCoveredByCapabilities(type, driver.capabilities)) {
        coveredTypes++;
      }
    });
    
    return (coveredTypes / types.length) * 100;
  }
  
  isTypeCoveredByCapabilities(type, capabilities) {
    // Mapping des types vers les capacités
    const typeCapabilityMap = {
      'bulb': ['onoff', 'dim'],
      'strip': ['onoff', 'dim', 'light_hue'],
      'temperature': ['measure_temperature'],
      'humidity': ['measure_humidity'],
      'motion': ['alarm_motion'],
      'door': ['alarm_contact'],
      'water': ['alarm_water'],
      'smoke': ['alarm_smoke'],
      'blind': ['windowcoverings_set'],
      'curtain': ['windowcoverings_set'],
      'thermostat': ['measure_temperature', 'target_temperature'],
      'valve': ['target_temperature'],
      'smart_lock': ['lock'],
      'keypad': ['lock', 'alarm_battery'],
      'indoor': ['onoff', 'measure_power'],
      'outdoor': ['onoff', 'measure_power', 'measure_temperature'],
      'scene': ['button'],
      'button': ['button'],
      'ceiling': ['onoff', 'dim'],
      'table': ['onoff', 'dim']
    };
    
    const requiredCapabilities = typeCapabilityMap[type] || [];
    return requiredCapabilities.every(cap => capabilities.includes(cap));
  }
  
  async analyzeExistingMatrices() {
    console.log('📊 ANALYSE DES MATRICES EXISTANTES');
    console.log('-----------------------------------');
    
    const matrixFiles = [
      'drivers-matrix.json',
      'drivers-index.json',
      'drivers-structure-index.json'
    ];
    
    for (const matrixFile of matrixFiles) {
      const matrixPath = path.join(__dirname, '../../', matrixFile);
      
      if (fs.existsSync(matrixPath)) {
        try {
          const matrixData = JSON.parse(fs.readFileSync(matrixPath, 'utf8'));
          console.log(`✅ ${matrixFile}:`);
          
          if (matrixData.statistics) {
            console.log(`   Total: ${matrixData.statistics.totalDrivers || 'N/A'}`);
            console.log(`   Valides: ${matrixData.statistics.validDrivers || 'N/A'}`);
            console.log(`   Erreurs: ${matrixData.statistics.errorDrivers || 'N/A'}`);
          }
          
          if (matrixData.drivers) {
            console.log(`   Drivers: ${matrixData.drivers.length}`);
          }
          
          if (Array.isArray(matrixData)) {
            console.log(`   Entrées: ${matrixData.length}`);
          }
          
        } catch (error) {
          console.log(`❌ ${matrixFile} - Erreur parsing: ${error.message}`);
        }
      } else {
        console.log(`⚠️ ${matrixFile} - Fichier non trouvé`);
      }
    }
    console.log('');
  }
  
  async generateComprehensiveReport() {
    console.log('📋 GÉNÉRATION DU RAPPORT COMPLET');
    console.log('----------------------------------');
    
    const report = {
      timestamp: new Date().toISOString(),
      scan_summary: {
        total_expected_drivers: this.expectedDrivers.length,
        total_current_drivers: this.currentDrivers.length,
        complete_drivers: this.currentDrivers.filter(d => d.status === 'COMPLETE').length,
        incomplete_drivers: this.currentDrivers.filter(d => d.status === 'INCOMPLETE').length,
        missing_drivers: this.currentDrivers.filter(d => d.status === 'MISSING').length
      },
      current_drivers: this.currentDrivers,
      coverage_analysis: {
        device_types: this.deviceTypes,
        source_categories: this.sourceCategories
      },
      recommendations: this.generateRecommendations(),
      next_steps: [
        'Vérifier la cohérence des drivers avec les sources externes',
        'Analyser les gaps de couverture des types de devices',
        'Valider l\'architecture universelle',
        'Tester la compatibilité des drivers',
        'Optimiser les capacités et clusters'
      ]
    };
    
    const reportPath = path.join(this.researchDir, 'comprehensive-scan-report.json');
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
    
    console.log(`✅ Rapport généré: ${reportPath}`);
    
    // Afficher le résumé
    console.log('\n📊 RÉSUMÉ DU SCAN COMPLET');
    console.log('============================');
    console.log(`🎯 Drivers attendus: ${report.scan_summary.total_expected_drivers}`);
    console.log(`📁 Drivers actuels: ${report.scan_summary.total_current_drivers}`);
    console.log(`✅ Drivers complets: ${report.scan_summary.complete_drivers}`);
    console.log(`⚠️ Drivers incomplets: ${report.scan_summary.incomplete_drivers}`);
    console.log(`❌ Drivers manquants: ${report.scan_summary.missing_drivers}`);
    
    if (report.scan_summary.complete_drivers === report.scan_summary.total_expected_drivers) {
      console.log('\n🎉 TOUS LES DRIVERS SONT COMPLETS !');
    } else {
      console.log('\n🔧 Certains drivers nécessitent une attention');
    }
  }
  
  generateRecommendations() {
    const recommendations = [];
    
    // Analyser les drivers incomplets
    const incompleteDrivers = this.currentDrivers.filter(d => d.status === 'INCOMPLETE');
    
    incompleteDrivers.forEach(driver => {
      if (!driver.hasCompose) {
        recommendations.push(`Créer driver.compose.json pour ${driver.id}`);
      }
      if (!driver.hasDevice) {
        recommendations.push(`Créer device.js pour ${driver.id}`);
      }
      if (!driver.hasAssets) {
        recommendations.push(`Générer les assets pour ${driver.id}`);
      }
      if (!driver.hasFlow) {
        recommendations.push(`Créer les flow cards pour ${driver.id}`);
      }
    });
    
    // Analyser les drivers manquants
    const missingDrivers = this.currentDrivers.filter(d => d.status === 'MISSING');
    
    missingDrivers.forEach(driver => {
      recommendations.push(`Créer complètement le driver ${driver.id}`);
    });
    
    // Recommandations générales
    recommendations.push('Vérifier la cohérence des capacités avec les types de devices');
    recommendations.push('Optimiser les clusters Zigbee pour chaque driver');
    recommendations.push('Valider la compatibilité avec les sources externes');
    
    return recommendations;
  }
}

// Exécuter le scan complet
if (require.main === module) {
  const scanner = new ComprehensiveDriverScanner();
  scanner.runComprehensiveScan();
}

module.exports = ComprehensiveDriverScanner;
