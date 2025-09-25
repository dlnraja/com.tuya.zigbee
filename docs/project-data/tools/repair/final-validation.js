#!/usr/bin/env node

console.log('🎯 VALIDATION FINALE DU PROJET TUYA ZIGBEE');
console.log('============================================');

const fs = require('fs');
const path = require('path');

class FinalValidator {
  constructor() {
    this.driversDir = path.join(__dirname, '../../drivers');
    this.researchDir = path.join(__dirname, '../../research');
    this.validationResults = {
      drivers: {},
      overall: {
        total_drivers: 0,
        complete_drivers: 0,
        incomplete_drivers: 0,
        missing_drivers: 0,
        coverage_score: 0
      }
    };
  }
  
  async runFinalValidation() {
    try {
      console.log('🚀 Début de la validation finale...\n');
      
      // 1. Valider la structure des drivers
      await this.validateDriverStructure();
      
      // 2. Vérifier la cohérence des capacités
      await this.validateCapabilities();
      
      // 3. Analyser la couverture des types de devices
      await this.analyzeDeviceCoverage();
      
      // 4. Générer le rapport final
      await this.generateFinalReport();
      
      console.log('✅ Validation finale terminée avec succès !');
      
    } catch (error) {
      console.error('❌ Erreur lors de la validation:', error.message);
      process.exit(1);
    }
  }
  
  async validateDriverStructure() {
    console.log('📁 VALIDATION DE LA STRUCTURE DES DRIVERS');
    console.log('------------------------------------------');
    
    const expectedDrivers = [
      'zigbee-tuya-universal',
      'tuya-plug-universal',
      'tuya-light-universal',
      'tuya-cover-universal',
      'tuya-climate-universal',
      'tuya-sensor-universal',
      'tuya-remote-universal',
      'fan-tuya-universal',
      'lock-tuya-universal',
      'switch'
    ];
    
    this.validationResults.overall.total_drivers = expectedDrivers.length;
    
    for (const driverId of expectedDrivers) {
      const driverPath = path.join(this.driversDir, driverId);
      
      if (fs.existsSync(driverPath)) {
        const driverInfo = await this.analyzeDriverStructure(driverId, driverPath);
        this.validationResults.drivers[driverId] = driverInfo;
        
        if (driverInfo.status === 'COMPLETE') {
          this.validationResults.overall.complete_drivers++;
        } else if (driverInfo.status === 'INCOMPLETE') {
          this.validationResults.overall.incomplete_drivers++;
        }
        
        console.log(`✅ ${driverId} - ${driverInfo.status}`);
      } else {
        this.validationResults.overall.missing_drivers++;
        this.validationResults.drivers[driverId] = {
          status: 'MISSING',
          issues: ['Driver directory missing']
        };
        console.log(`❌ ${driverId} - MANQUANT`);
      }
    }
    
    console.log(`\n📊 Structure: ${this.validationResults.overall.complete_drivers}/${this.validationResults.overall.total_drivers} complets\n`);
  }
  
  async analyzeDriverStructure(driverId, driverPath) {
    const files = fs.readdirSync(driverPath);
    const hasCompose = files.includes('driver.compose.json');
    const hasDevice = files.includes('device.js');
    const hasAssets = fs.existsSync(path.join(driverPath, 'assets')) && fs.readdirSync(path.join(driverPath, 'assets')).length > 0;
    const hasFlow = fs.existsSync(path.join(driverPath, 'flow')) && fs.readdirSync(path.join(driverPath, 'flow')).length > 0;
    const hasReadme = files.includes('README.md');
    
    let status = 'COMPLETE';
    let issues = [];
    let capabilities = [];
    let clusters = [];
    
    if (!hasCompose) {
      status = 'INCOMPLETE';
      issues.push('driver.compose.json missing');
    } else {
      try {
        const composePath = path.join(driverPath, 'driver.compose.json');
        const composeData = JSON.parse(fs.readFileSync(composePath, 'utf8'));
        capabilities = composeData.capabilities || [];
        clusters = composeData.zigbee?.clusters || [];
      } catch (error) {
        issues.push(`Error parsing driver.compose.json: ${error.message}`);
      }
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
    
    if (!hasReadme) {
      status = 'INCOMPLETE';
      issues.push('README.md missing');
    }
    
    return {
      status,
      path: driverPath,
      files: files,
      capabilities,
      clusters,
      issues,
      hasCompose,
      hasDevice,
      hasAssets,
      hasFlow,
      hasReadme
    };
  }
  
  async validateCapabilities() {
    console.log('🎯 VALIDATION DES CAPACITÉS');
    console.log('----------------------------');
    
    const capabilityAnalysis = {};
    
    for (const [driverId, driverInfo] of Object.entries(this.validationResults.drivers)) {
      if (driverInfo.capabilities && driverInfo.capabilities.length > 0) {
        capabilityAnalysis[driverId] = {
          capabilities: driverInfo.capabilities,
          count: driverInfo.capabilities.length,
          status: 'VALID'
        };
        console.log(`✅ ${driverId}: ${driverInfo.capabilities.length} capacités`);
      } else {
        capabilityAnalysis[driverId] = {
          capabilities: [],
          count: 0,
          status: 'MISSING'
        };
        console.log(`❌ ${driverId}: Aucune capacité`);
      }
    }
    
    this.validationResults.capability_analysis = capabilityAnalysis;
    console.log('');
  }
  
  async analyzeDeviceCoverage() {
    console.log('📊 ANALYSE DE LA COUVERTURE DES TYPES DE DEVICES');
    console.log('------------------------------------------------');
    
    const deviceTypes = {
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
    
    let totalCoverage = 0;
    let coveredTypes = 0;
    
    for (const [deviceType, types] of Object.entries(deviceTypes)) {
      const driverId = this.findDriverForType(deviceType);
      
      if (driverId && this.validationResults.drivers[driverId]?.status === 'COMPLETE') {
        const coverage = this.calculateTypeCoverage(deviceType, types, this.validationResults.drivers[driverId]);
        totalCoverage += coverage;
        coveredTypes++;
        
        console.log(`✅ ${deviceType}: ${coverage.toFixed(1)}% couvert (${types.length} types)`);
      } else {
        console.log(`❌ ${deviceType}: Non couvert (${types.length} types manquants)`);
      }
    }
    
    const overallCoverage = totalCoverage / Math.max(coveredTypes, 1);
    this.validationResults.overall.coverage_score = overallCoverage;
    
    console.log(`\n📊 Couverture globale: ${overallCoverage.toFixed(1)}%\n`);
  }
  
  findDriverForType(deviceType) {
    const drivers = Object.keys(this.validationResults.drivers);
    return drivers.find(driver => driver.includes(deviceType)) || null;
  }
  
  calculateTypeCoverage(category, types, driver) {
    if (!driver.capabilities || driver.capabilities.length === 0) {
      return 0;
    }
    
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
    
    let coveredTypes = 0;
    
    types.forEach(type => {
      const requiredCapabilities = typeCapabilityMap[type] || [];
      if (requiredCapabilities.every(cap => driver.capabilities.includes(cap))) {
        coveredTypes++;
      }
    });
    
    return (coveredTypes / types.length) * 100;
  }
  
  async generateFinalReport() {
    console.log('📋 GÉNÉRATION DU RAPPORT FINAL');
    console.log('--------------------------------');
    
    const report = {
      timestamp: new Date().toISOString(),
      project_info: {
        name: 'Tuya Zigbee (Lite)',
        version: '1.0.0',
        architecture: 'Universal Drivers',
        total_drivers: this.validationResults.overall.total_drivers
      },
      validation_summary: this.validationResults.overall,
      drivers_status: this.validationResults.drivers,
      capability_analysis: this.validationResults.capability_analysis,
      recommendations: this.generateRecommendations(),
      next_steps: [
        'Tester tous les drivers avec Homey',
        'Valider la compatibilité des capacités',
        'Optimiser les performances',
        'Documenter les fonctionnalités',
        'Préparer le déploiement'
      ]
    };
    
    const reportPath = path.join(this.researchDir, 'final-validation-report.json');
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
    
    console.log(`✅ Rapport final généré: ${reportPath}`);
    
    // Afficher le résumé final
    console.log('\n🎯 RÉSUMÉ FINAL DE LA VALIDATION');
    console.log('==================================');
    console.log(`🔌 Drivers totaux: ${report.validation_summary.total_drivers}`);
    console.log(`✅ Drivers complets: ${report.validation_summary.complete_drivers}`);
    console.log(`⚠️ Drivers incomplets: ${report.validation_summary.incomplete_drivers}`);
    console.log(`❌ Drivers manquants: ${report.validation_summary.missing_drivers}`);
    console.log(`📊 Score de couverture: ${report.validation_summary.coverage_score.toFixed(1)}%`);
    
    if (report.validation_summary.complete_drivers === report.validation_summary.total_drivers) {
      console.log('\n🎉 TOUS LES DRIVERS SONT COMPLETS !');
      console.log('🚀 Le projet est prêt pour la production !');
    } else {
      console.log('\n🔧 Certains drivers nécessitent encore une attention');
    }
  }
  
  generateRecommendations() {
    const recommendations = [];
    
    // Analyser les drivers incomplets
    for (const [driverId, driverInfo] of Object.entries(this.validationResults.drivers)) {
      if (driverInfo.status === 'INCOMPLETE') {
        driverInfo.issues.forEach(issue => {
          recommendations.push(`🔧 ${driverId}: ${issue}`);
        });
      }
    }
    
    // Recommandations générales
    if (this.validationResults.overall.coverage_score < 80) {
      recommendations.push('📊 Améliorer la couverture des types de devices');
    }
    
    recommendations.push('🧪 Tester la compatibilité avec Homey');
    recommendations.push('⚡ Optimiser les performances des drivers');
    recommendations.push('📚 Documenter les fonctionnalités avancées');
    
    return recommendations;
  }
}

// Exécuter la validation finale
if (require.main === module) {
  const validator = new FinalValidator();
  validator.runFinalValidation();
}

module.exports = FinalValidator;
