#!/usr/bin/env node

console.log('🔗 CORRECTION DES CLUSTERS MANQUANTS');
console.log('=====================================');

const fs = require('fs');
const path = require('path');

class ClusterFixer {
  constructor() {
    this.driversDir = path.join(__dirname, '../../drivers');
    this.researchDir = path.join(__dirname, '../../research');
    
    // Mapping des clusters par type de device
    this.clusterMapping = {
      'light': {
        required: ['genOnOff', 'genLevelCtrl', 'lightingColorCtrl', 'lightingBallastCfg'],
        recommended: ['genScenes', 'genGroups', 'genBasic']
      },
      'sensor': {
        required: ['genBasic', 'msTemperatureMeasurement', 'msRelativeHumidity', 'msPressureMeasurement'],
        recommended: ['genPowerCfg', 'genIdentify']
      },
      'switch': {
        required: ['genOnOff', 'genLevelCtrl', 'genPowerCfg', 'haElectricalMeasurement'],
        recommended: ['genScenes', 'genGroups', 'genBasic']
      },
      'cover': {
        required: ['genWindowCovering', 'genBasic', 'msTemperatureMeasurement'],
        recommended: ['genPowerCfg', 'genIdentify']
      },
      'climate': {
        required: ['genBasic', 'msTemperatureMeasurement', 'msRelativeHumidity', 'hvacThermostat'],
        recommended: ['genPowerCfg', 'genIdentify']
      },
      'lock': {
        required: ['genDoorLock', 'genPowerCfg', 'genBasic', 'msTemperatureMeasurement'],
        recommended: ['genIdentify', 'genAlarms']
      },
      'fan': {
        required: ['genOnOff', 'genLevelCtrl', 'genPowerCfg', 'genBasic'],
        recommended: ['genScenes', 'genGroups']
      },
      'plug': {
        required: ['genOnOff', 'genPowerCfg', 'haElectricalMeasurement', 'genBasic'],
        recommended: ['genScenes', 'genGroups']
      },
      'remote': {
        required: ['genBasic', 'genPowerCfg', 'genOnOff'],
        recommended: ['genScenes', 'genGroups']
      }
    };
  }
  
  async fixAllClusters() {
    try {
      console.log('🚀 Début de la correction des clusters...\n');
      
      // 1. Analyser tous les drivers
      const drivers = this.getAllDrivers();
      
      // 2. Corriger les clusters pour chaque driver
      let fixedCount = 0;
      let totalCount = drivers.length;
      
      for (const driver of drivers) {
        console.log(`🔧 Correction des clusters pour ${driver.id}...`);
        
        const result = await this.fixDriverClusters(driver);
        
        if (result.success) {
          fixedCount++;
          console.log(`✅ ${driver.id} - Clusters corrigés: ${result.added.join(', ')}`);
        } else {
          console.log(`❌ ${driver.id} - Erreur: ${result.error}`);
        }
      }
      
      // 3. Générer le rapport
      await this.generateClusterReport(drivers, fixedCount, totalCount);
      
      console.log(`\n📊 Résumé: ${fixedCount}/${totalCount} drivers corrigés`);
      console.log('✅ Correction des clusters terminée !');
      
    } catch (error) {
      console.error('❌ Erreur lors de la correction:', error.message);
      process.exit(1);
    }
  }
  
  getAllDrivers() {
    const drivers = [];
    const driverDirs = fs.readdirSync(this.driversDir).filter(dir => 
      fs.statSync(path.join(this.driversDir, dir)).isDirectory()
    );
    
    for (const driverDir of driverDirs) {
      const driverPath = path.join(this.driversDir, driverDir);
      const composePath = path.join(driverPath, 'driver.compose.json');
      
      if (fs.existsSync(composePath)) {
        try {
          const composeData = JSON.parse(fs.readFileSync(composePath, 'utf8'));
          drivers.push({
            id: driverDir,
            path: driverPath,
            composePath: composePath,
            composeData: composeData,
            deviceType: this.extractDeviceType(driverDir)
          });
        } catch (error) {
          console.log(`⚠️ Erreur parsing ${driverDir}: ${error.message}`);
        }
      }
    }
    
    return drivers;
  }
  
  extractDeviceType(driverId) {
    const typeMap = {
      'light': 'light',
      'sensor': 'sensor',
      'switch': 'switch',
      'cover': 'cover',
      'climate': 'climate',
      'lock': 'lock',
      'fan': 'fan',
      'plug': 'plug',
      'remote': 'remote'
    };
    
    for (const [type, _] of Object.entries(typeMap)) {
      if (driverId.includes(type)) {
        return type;
      }
    }
    
    return 'device';
  }
  
  async fixDriverClusters(driver) {
    try {
      const deviceType = driver.deviceType;
      
      if (!this.clusterMapping[deviceType]) {
        return { success: false, error: `Type de device non supporté: ${deviceType}` };
      }
      
      const requiredClusters = this.clusterMapping[deviceType].required;
      const recommendedClusters = this.clusterMapping[deviceType].recommended;
      
      // Initialiser la section zigbee si elle n'existe pas
      if (!driver.composeData.zigbee) {
        driver.composeData.zigbee = {};
      }
      
      const currentClusters = driver.composeData.zigbee.clusters || [];
      
      // Ajouter les clusters requis manquants
      const missingRequired = requiredClusters.filter(cluster => !currentClusters.includes(cluster));
      const missingRecommended = recommendedClusters.filter(cluster => !currentClusters.includes(cluster));
      
      // Ajouter tous les clusters manquants
      const allMissing = [...missingRequired, ...missingRecommended];
      const newClusters = [...new Set([...currentClusters, ...allMissing])];
      
      // Mettre à jour les clusters
      driver.composeData.zigbee.clusters = newClusters;
      
      // Ajouter des informations supplémentaires si elles n'existent pas
      if (!driver.composeData.zigbee.manufacturer) {
        driver.composeData.zigbee.manufacturer = 'Tuya';
      }
      if (!driver.composeData.zigbee.model) {
        driver.composeData.zigbee.model = 'Universal';
      }
      if (!driver.composeData.zigbee.vendor) {
        driver.composeData.zigbee.vendor = 'Tuya';
      }
      if (!driver.composeData.zigbee.description) {
        driver.composeData.zigbee.description = `Universal Tuya ${deviceType} device`;
      }
      if (!driver.composeData.zigbee.supports) {
        driver.composeData.zigbee.supports = 'Zigbee 1.2';
      }
      if (!driver.composeData.zigbee.firmware) {
        driver.composeData.zigbee.firmware = '1.0.0';
      }
      
      // Sauvegarder le fichier
      fs.writeFileSync(driver.composePath, JSON.stringify(driver.composeData, null, 2));
      
      return {
        success: true,
        added: allMissing,
        total: newClusters.length,
        required: requiredClusters,
        recommended: recommendedClusters
      };
      
    } catch (error) {
      return { success: false, error: error.message };
    }
  }
  
  async generateClusterReport(drivers, fixedCount, totalCount) {
    console.log('\n📋 GÉNÉRATION DU RAPPORT DE CORRECTION DES CLUSTERS');
    console.log('----------------------------------------------------');
    
    const report = {
      timestamp: new Date().toISOString(),
      summary: {
        total_drivers: totalCount,
        fixed_drivers: fixedCount,
        success_rate: ((fixedCount / totalCount) * 100).toFixed(1)
      },
      cluster_mapping: this.clusterMapping,
      drivers_analysis: drivers.map(driver => ({
        id: driver.id,
        device_type: driver.deviceType,
        clusters_before: driver.composeData.zigbee?.clusters || [],
        clusters_after: this.clusterMapping[driver.deviceType]?.required || [],
        status: 'analyzed'
      })),
      recommendations: [
        'Tester la compatibilité des clusters ajoutés',
        'Valider le fonctionnement des capacités',
        'Vérifier la stabilité des communications Zigbee',
        'Optimiser les performances des clusters'
      ]
    };
    
    const reportPath = path.join(this.researchDir, 'cluster-fix-report.json');
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
    
    console.log(`✅ Rapport généré: ${reportPath}`);
    
    // Afficher le résumé
    console.log('\n📊 RÉSUMÉ DE LA CORRECTION DES CLUSTERS');
    console.log('=========================================');
    console.log(`🔌 Drivers totaux: ${totalCount}`);
    console.log(`✅ Drivers corrigés: ${fixedCount}`);
    console.log(`📈 Taux de succès: ${report.summary.success_rate}%`);
    
    if (report.summary.success_rate >= 80) {
      console.log('\n🎉 Correction des clusters très réussie !');
    } else if (report.summary.success_rate >= 60) {
      console.log('\n✅ Correction des clusters réussie');
    } else {
      console.log('\n⚠️ Correction des clusters partielle');
    }
  }
}

// Exécuter la correction des clusters
if (require.main === module) {
  const fixer = new ClusterFixer();
  fixer.fixAllClusters();
}

module.exports = ClusterFixer;
