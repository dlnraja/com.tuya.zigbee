#!/usr/bin/env node

console.log('🧠 ANALYSE AVANCÉE DES SOURCES - NLP & COUVERTURE');
console.log('==================================================');

const fs = require('fs');
const path = require('path');

class AdvancedSourceAnalyzer {
  constructor() {
    this.researchDir = path.join(__dirname, '../../research');
    this.driversDir = path.join(__dirname, '../../drivers');
    
    // Sources de données externes
    this.externalSources = {
      'Zigbee2MQTT': {
        url: 'https://www.zigbee2mqtt.io/devices/',
        categories: ['lights', 'sensors', 'switches', 'covers', 'plugs', 'thermostats', 'locks', 'fans'],
        deviceTypes: ['bulb', 'strip', 'panel', 'switch', 'sensor', 'cover', 'plug', 'thermostat', 'lock', 'fan']
      },
      'Blakadder': {
        url: 'https://blakadder.com/tuya/',
        categories: ['motion', 'temperature', 'humidity', 'door', 'water', 'smoke', 'gas', 'vibration'],
        deviceTypes: ['motion_sensor', 'temp_sensor', 'humidity_sensor', 'door_sensor', 'water_sensor', 'smoke_sensor']
      },
      'Homey Forums': {
        url: 'https://community.homey.app/',
        categories: ['community', 'user_reports', 'compatibility', 'issues', 'feature_requests'],
        deviceTypes: ['user_reported', 'community_tested', 'compatibility_issues']
      },
      'Tuya Developer': {
        url: 'https://developer.tuya.com/',
        categories: ['official_specs', 'clusters', 'capabilities', 'firmware', 'api'],
        deviceTypes: ['official_device', 'certified_device', 'development_device']
      },
      'Home Assistant': {
        url: 'https://www.home-assistant.io/integrations/',
        categories: ['integrations', 'device_traits', 'automation', 'templates', 'blueprints'],
        deviceTypes: ['ha_integration', 'device_trait', 'automation_template']
      }
    };
    
    // Types de devices et leurs capacités requises
    this.deviceCapabilityMapping = {
      'light': {
        basic: ['onoff', 'dim'],
        advanced: ['light_temperature', 'light_hue', 'light_saturation', 'light_mode'],
        clusters: ['genOnOff', 'genLevelCtrl', 'lightingColorCtrl', 'lightingBallastCfg']
      },
      'sensor': {
        basic: ['measure_temperature', 'measure_humidity', 'measure_pressure'],
        advanced: ['measure_co2', 'measure_tvoc', 'measure_pm25', 'measure_noise'],
        clusters: ['genBasic', 'msTemperatureMeasurement', 'msRelativeHumidity', 'msPressureMeasurement']
      },
      'switch': {
        basic: ['onoff'],
        advanced: ['dim', 'measure_power', 'meter_power'],
        clusters: ['genOnOff', 'genLevelCtrl', 'genPowerCfg', 'haElectricalMeasurement']
      },
      'cover': {
        basic: ['windowcoverings_set', 'windowcoverings_state'],
        advanced: ['windowcoverings_tilt_set', 'measure_temperature'],
        clusters: ['genWindowCovering', 'genBasic', 'msTemperatureMeasurement']
      },
      'climate': {
        basic: ['measure_temperature', 'target_temperature'],
        advanced: ['measure_humidity', 'target_humidity', 'measure_pressure'],
        clusters: ['genBasic', 'msTemperatureMeasurement', 'msRelativeHumidity', 'hvacThermostat']
      },
      'lock': {
        basic: ['lock', 'alarm_battery'],
        advanced: ['measure_temperature', 'alarm_contact', 'alarm_tamper'],
        clusters: ['genDoorLock', 'genPowerCfg', 'genBasic', 'msTemperatureMeasurement']
      },
      'fan': {
        basic: ['onoff', 'dim'],
        advanced: ['measure_power', 'measure_temperature', 'fan_mode'],
        clusters: ['genOnOff', 'genLevelCtrl', 'genPowerCfg', 'genBasic']
      },
      'plug': {
        basic: ['onoff', 'measure_power'],
        advanced: ['meter_power', 'measure_voltage', 'measure_current', 'alarm_battery'],
        clusters: ['genOnOff', 'genPowerCfg', 'haElectricalMeasurement', 'genBasic']
      },
      'remote': {
        basic: ['button'],
        advanced: ['measure_battery', 'alarm_battery'],
        clusters: ['genBasic', 'genPowerCfg', 'genOnOff']
      }
    };
  }
  
  async runAdvancedAnalysis() {
    try {
      console.log('🚀 Début de l\'analyse avancée...\n');
      
      // 1. Analyser les sources externes
      await this.analyzeExternalSources();
      
      // 2. Analyser la couverture des capacités
      await this.analyzeCapabilityCoverage();
      
      // 3. Identifier les gaps de couverture
      await this.identifyCoverageGaps();
      
      // 4. Analyser la compatibilité des clusters
      await this.analyzeClusterCompatibility();
      
      // 5. Générer le rapport d'analyse avancée
      await this.generateAdvancedReport();
      
      console.log('✅ Analyse avancée terminée avec succès !');
      console.log('::END::ADVANCED_ANALYSIS::OK');
      
    } catch (error) {
      console.error('❌ Erreur lors de l\'analyse:', error.message);
      console.log('::END::ADVANCED_ANALYSIS::FAIL');
      process.exit(1);
    }
  }
  
  async analyzeExternalSources() {
    console.log('🌐 ANALYSE DES SOURCES EXTERNES');
    console.log('--------------------------------');
    
    for (const [sourceName, sourceInfo] of Object.entries(this.externalSources)) {
      console.log(`\n📊 ${sourceName}:`);
      console.log(`   URL: ${sourceInfo.url}`);
      console.log(`   Catégories: ${sourceInfo.categories.join(', ')}`);
      console.log(`   Types de devices: ${sourceInfo.deviceTypes.join(', ')}`);
      
      // Analyser les données de la source si disponibles
      const sourceDataPath = path.join(this.researchDir, 'source-data', `${sourceName.toLowerCase().replace(' ', '-')}.json`);
      
      if (fs.existsSync(sourceDataPath)) {
        try {
          const sourceData = JSON.parse(fs.readFileSync(sourceDataPath, 'utf8'));
          console.log(`   ✅ Données disponibles: ${sourceData.devices?.length || 0} devices`);
          
          // Analyser la distribution des types
          if (sourceData.devices) {
            const typeDistribution = this.analyzeTypeDistribution(sourceData.devices);
            console.log(`   📈 Distribution: ${Object.entries(typeDistribution).map(([type, count]) => `${type}:${count}`).join(', ')}`);
          }
          
        } catch (error) {
          console.log(`   ❌ Erreur parsing: ${error.message}`);
        }
      } else {
        console.log(`   ⚠️ Données non disponibles`);
      }
    }
    console.log('');
  }
  
  analyzeTypeDistribution(devices) {
    const distribution = {};
    
    devices.forEach(device => {
      const type = device.type || device.category || 'unknown';
      distribution[type] = (distribution[type] || 0) + 1;
    });
    
    return distribution;
  }
  
  async analyzeCapabilityCoverage() {
    console.log('🎯 ANALYSE DE LA COUVERTURE DES CAPACITÉS');
    console.log('-------------------------------------------');
    
    // Analyser les drivers actuels
    const currentDrivers = fs.readdirSync(this.driversDir).filter(dir => 
      fs.statSync(path.join(this.driversDir, dir)).isDirectory()
    );
    
    console.log(`\n📁 Drivers actuels (${currentDrivers.length}):`);
    
    for (const driverDir of currentDrivers) {
      const driverPath = path.join(this.driversDir, driverDir);
      const composePath = path.join(driverPath, 'driver.compose.json');
      
      if (fs.existsSync(composePath)) {
        try {
          const composeData = JSON.parse(fs.readFileSync(composePath, 'utf8'));
          const capabilities = composeData.capabilities || [];
          const clusters = composeData.zigbee?.clusters || [];
          
          console.log(`\n🔌 ${driverDir}:`);
          console.log(`   Capacités: ${capabilities.join(', ')}`);
          console.log(`   Clusters: ${clusters.join(', ')}`);
          
          // Analyser la couverture des capacités
          const coverage = this.calculateCapabilityCoverage(driverDir, capabilities);
          console.log(`   Couverture: ${coverage.toFixed(1)}%`);
          
        } catch (error) {
          console.log(`\n❌ ${driverDir}: Erreur parsing - ${error.message}`);
        }
      } else {
        console.log(`\n⚠️ ${driverDir}: driver.compose.json manquant`);
      }
    }
    console.log('');
  }
  
  calculateCapabilityCoverage(driverId, capabilities) {
    // Identifier le type de device basé sur l'ID
    let deviceType = 'unknown';
    
    for (const [type, _] of Object.entries(this.deviceCapabilityMapping)) {
      if (driverId.includes(type)) {
        deviceType = type;
        break;
      }
    }
    
    if (deviceType === 'unknown') {
      return 0;
    }
    
    const requiredCapabilities = [
      ...this.deviceCapabilityMapping[deviceType].basic,
      ...this.deviceCapabilityMapping[deviceType].advanced
    ];
    
    const coveredCapabilities = requiredCapabilities.filter(cap => capabilities.includes(cap));
    return (coveredCapabilities.length / requiredCapabilities.length) * 100;
  }
  
  async identifyCoverageGaps() {
    console.log('🔍 IDENTIFICATION DES GAPS DE COUVERTURE');
    console.log('----------------------------------------');
    
    const gaps = [];
    
    for (const [deviceType, capabilityInfo] of Object.entries(this.deviceCapabilityMapping)) {
      console.log(`\n📋 ${deviceType.toUpperCase()}:`);
      
      // Vérifier si un driver existe pour ce type
      const existingDriver = this.findDriverForType(deviceType);
      
      if (existingDriver) {
        console.log(`   ✅ Driver existant: ${existingDriver}`);
        
        // Analyser les capacités manquantes
        const missingCapabilities = this.identifyMissingCapabilities(deviceType, existingDriver);
        
        if (missingCapabilities.length > 0) {
          console.log(`   ⚠️ Capacités manquantes: ${missingCapabilities.join(', ')}`);
          gaps.push({
            deviceType,
            driver: existingDriver,
            missingCapabilities,
            severity: 'medium'
          });
        } else {
          console.log(`   🎉 Toutes les capacités couvertes`);
        }
      } else {
        console.log(`   ❌ Aucun driver trouvé`);
        gaps.push({
          deviceType,
          driver: null,
          missingCapabilities: capabilityInfo.basic,
          severity: 'high'
        });
      }
    }
    
    // Sauvegarder les gaps identifiés
    const gapsPath = path.join(this.researchDir, 'coverage-gaps.json');
    fs.writeFileSync(gapsPath, JSON.stringify(gaps, null, 2));
    
    console.log(`\n📊 Gaps identifiés: ${gaps.length}`);
    console.log(`✅ Rapport sauvegardé: ${gapsPath}`);
    console.log('');
  }
  
  findDriverForType(deviceType) {
    const drivers = fs.readdirSync(this.driversDir).filter(dir => 
      fs.statSync(path.join(this.driversDir, dir)).isDirectory()
    );
    
    return drivers.find(driver => driver.includes(deviceType)) || null;
  }
  
  identifyMissingCapabilities(deviceType, driverId) {
    const driverPath = path.join(this.driversDir, driverId);
    const composePath = path.join(driverPath, 'driver.compose.json');
    
    if (!fs.existsSync(composePath)) {
      return this.deviceCapabilityMapping[deviceType].basic;
    }
    
    try {
      const composeData = JSON.parse(fs.readFileSync(composePath, 'utf8'));
      const currentCapabilities = composeData.capabilities || [];
      
      const requiredCapabilities = [
        ...this.deviceCapabilityMapping[deviceType].basic,
        ...this.deviceCapabilityMapping[deviceType].advanced
      ];
      
      return requiredCapabilities.filter(cap => !currentCapabilities.includes(cap));
    } catch (error) {
      return this.deviceCapabilityMapping[deviceType].basic;
    }
  }
  
  async analyzeClusterCompatibility() {
    console.log('🔗 ANALYSE DE LA COMPATIBILITÉ DES CLUSTERS');
    console.log('--------------------------------------------');
    
    const clusterAnalysis = {};
    
    for (const [deviceType, capabilityInfo] of Object.entries(this.deviceCapabilityMapping)) {
      clusterAnalysis[deviceType] = {
        required: capabilityInfo.clusters,
        recommended: this.getRecommendedClusters(deviceType),
        compatibility: {}
      };
      
      // Analyser la compatibilité avec les drivers existants
      const existingDriver = this.findDriverForType(deviceType);
      if (existingDriver) {
        const driverPath = path.join(this.driversDir, existingDriver);
        const composePath = path.join(driverPath, 'driver.compose.json');
        
        if (fs.existsSync(composePath)) {
          try {
            const composeData = JSON.parse(fs.readFileSync(composePath, 'utf8'));
            const currentClusters = composeData.zigbee?.clusters || [];
            
            clusterAnalysis[deviceType].compatibility = {
              current: currentClusters,
              missing: capabilityInfo.clusters.filter(cluster => !currentClusters.includes(cluster)),
              extra: currentClusters.filter(cluster => !capabilityInfo.clusters.includes(cluster))
            };
          } catch (error) {
            clusterAnalysis[deviceType].compatibility = { error: error.message };
          }
        }
      }
    }
    
    // Afficher l'analyse
    for (const [deviceType, analysis] of Object.entries(clusterAnalysis)) {
      console.log(`\n🔌 ${deviceType.toUpperCase()}:`);
      console.log(`   Clusters requis: ${analysis.required.join(', ')}`);
      
      if (analysis.compatibility.current) {
        console.log(`   Clusters actuels: ${analysis.compatibility.current.join(', ')}`);
        
        if (analysis.compatibility.missing.length > 0) {
          console.log(`   ⚠️ Clusters manquants: ${analysis.compatibility.missing.join(', ')}`);
        }
        
        if (analysis.compatibility.extra.length > 0) {
          console.log(`   ➕ Clusters supplémentaires: ${analysis.compatibility.extra.join(', ')}`);
        }
      } else {
        console.log(`   ❌ Aucun cluster configuré`);
      }
    }
    
    // Sauvegarder l'analyse des clusters
    const clusterPath = path.join(this.researchDir, 'cluster-compatibility.json');
    fs.writeFileSync(clusterPath, JSON.stringify(clusterAnalysis, null, 2));
    
    console.log(`\n✅ Analyse des clusters sauvegardée: ${clusterPath}`);
    console.log('');
  }
  
  getRecommendedClusters(deviceType) {
    // Clusters recommandés supplémentaires selon le type de device
    const additionalClusters = {
      'light': ['genScenes', 'genGroups'],
      'sensor': ['genPowerCfg', 'genIdentify'],
      'switch': ['genScenes', 'genGroups'],
      'cover': ['genPowerCfg', 'genIdentify'],
      'climate': ['genPowerCfg', 'genIdentify'],
      'lock': ['genIdentify', 'genAlarms'],
      'fan': ['genScenes', 'genGroups'],
      'plug': ['genScenes', 'genGroups'],
      'remote': ['genScenes', 'genGroups']
    };
    
    return additionalClusters[deviceType] || [];
  }
  
  async generateAdvancedReport() {
    console.log('📋 GÉNÉRATION DU RAPPORT D\'ANALYSE AVANCÉE');
    console.log('---------------------------------------------');
    
    const report = {
      timestamp: new Date().toISOString(),
      analysis_summary: {
        external_sources_analyzed: Object.keys(this.externalSources).length,
        device_types_analyzed: Object.keys(this.deviceCapabilityMapping).length,
        drivers_analyzed: fs.readdirSync(this.driversDir).filter(dir => 
          fs.statSync(path.join(this.driversDir, dir)).isDirectory()
        ).length
      },
      external_sources: this.externalSources,
      device_capability_mapping: this.deviceCapabilityMapping,
      coverage_gaps: this.loadCoverageGaps(),
      cluster_compatibility: this.loadClusterCompatibility(),
      recommendations: this.generateAdvancedRecommendations(),
      next_steps: [
        'Implémenter les capacités manquantes identifiées',
        'Ajouter les clusters Zigbee recommandés',
        'Valider la compatibilité avec les sources externes',
        'Tester la couverture complète des types de devices',
        'Optimiser l\'architecture des drivers'
      ]
    };
    
    const reportPath = path.join(this.researchDir, 'advanced-analysis-report.json');
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
    
    console.log(`✅ Rapport avancé généré: ${reportPath}`);
    
    // Afficher le résumé
    console.log('\n📊 RÉSUMÉ DE L\'ANALYSE AVANCÉE');
    console.log('==================================');
    console.log(`🌐 Sources externes: ${report.analysis_summary.external_sources_analyzed}`);
    console.log(`🎯 Types de devices: ${report.analysis_summary.device_types_analyzed}`);
    console.log(`🔌 Drivers analysés: ${report.analysis_summary.drivers_analyzed}`);
    
    const gaps = this.loadCoverageGaps();
    console.log(`⚠️ Gaps identifiés: ${gaps.length}`);
    
    if (gaps.length === 0) {
      console.log('\n🎉 Aucun gap de couverture identifié !');
    } else {
      console.log('\n🔧 Gaps nécessitent une attention immédiate');
    }
  }
  
  loadCoverageGaps() {
    const gapsPath = path.join(this.researchDir, 'coverage-gaps.json');
    if (fs.existsSync(gapsPath)) {
      try {
        return JSON.parse(fs.readFileSync(gapsPath, 'utf8'));
      } catch (error) {
        return [];
      }
    }
    return [];
  }
  
  loadClusterCompatibility() {
    const clusterPath = path.join(this.researchDir, 'cluster-compatibility.json');
    if (fs.existsSync(clusterPath)) {
      try {
        return JSON.parse(fs.readFileSync(clusterPath, 'utf8'));
      } catch (error) {
        return {};
      }
    }
    return {};
  }
  
  generateAdvancedRecommendations() {
    const recommendations = [];
    
    // Analyser les gaps de couverture
    const gaps = this.loadCoverageGaps();
    
    gaps.forEach(gap => {
      if (gap.severity === 'high') {
        recommendations.push(`🚨 CRITIQUE: Créer un driver pour ${gap.deviceType} avec capacités: ${gap.missingCapabilities.join(', ')}`);
      } else if (gap.severity === 'medium') {
        recommendations.push(`⚠️ IMPORTANT: Ajouter capacités manquantes à ${gap.driver}: ${gap.missingCapabilities.join(', ')}`);
      }
    });
    
    // Recommandations générales
    recommendations.push('🔧 Optimiser la couverture des clusters Zigbee');
    recommendations.push('📊 Valider la compatibilité avec les sources externes');
    recommendations.push('🧪 Tester la couverture complète des types de devices');
    recommendations.push('⚡ Améliorer les performances des drivers existants');
    
    return recommendations;
  }
}

// Exécuter l'analyse avancée
if (require.main === module) {
  const analyzer = new AdvancedSourceAnalyzer();
  analyzer.runAdvancedAnalysis();
}

module.exports = AdvancedSourceAnalyzer;
