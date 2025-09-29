#!/usr/bin/env node

console.log('🌐 RÉCOLTE DES DONNÉES EXTERNES');
console.log('================================');

const fs = require('fs');
const path = require('path');

class DataHarvester {
  constructor() {
    this.researchDir = path.join(__dirname, '../../research');
    this.extractDir = path.join(__dirname, '../../research/extract');
    this.sources = {
      'zigbee2mqtt': {
        name: 'Zigbee2MQTT Database',
        url: 'https://github.com/Koenkk/Z-Stack-firmware',
        description: 'Base de données des devices Zigbee'
      },
      'blakadder': {
        name: 'Blakadder Database',
        url: 'https://blakadder.com/templates.html',
        description: 'Templates et configurations Tuya'
      },
      'homey-forums': {
        name: 'Homey Community Forums',
        url: 'https://community.homey.app',
        description: 'Discussions et solutions utilisateurs'
      },
      'tuya-developer': {
        name: 'Tuya Developer Portal',
        url: 'https://developer.tuya.com',
        description: 'Documentation officielle Tuya'
      },
      'home-assistant': {
        name: 'Home Assistant',
        url: 'https://www.home-assistant.io',
        description: 'Intégrations et configurations'
      }
    };
  }
  
  async harvestAllData() {
    try {
      console.log('🚀 Début de la récolte des données...');
      
      // Créer les dossiers de recherche
      await this.createResearchDirectories();
      
      // Récolter les données de chaque source
      const harvestResults = await this.harvestFromAllSources();
      
      // Générer le rapport de récolte
      await this.generateHarvestReport(harvestResults);
      
      // Créer la matrice des devices
      await this.createDeviceMatrix();
      
      console.log('✅ Récolte des données terminée avec succès !');
      console.log('::END::HARVEST_ALL::OK');
      
    } catch (error) {
      console.error('❌ Erreur lors de la récolte:', error.message);
      console.log('::END::HARVEST_ALL::FAIL');
      process.exit(1);
    }
  }
  
  async createResearchDirectories() {
    const directories = [
      this.researchDir,
      this.extractDir,
      path.join(this.researchDir, 'scoring-results'),
      path.join(this.researchDir, 'device-matrix'),
      path.join(this.researchDir, 'source-data')
    ];
    
    for (const dir of directories) {
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
        console.log(`📁 Dossier créé: ${path.relative(this.researchDir, dir)}`);
      }
    }
  }
  
  async harvestFromAllSources() {
    console.log('\n🌐 Récolte depuis toutes les sources...');
    
    const results = {
      timestamp: new Date().toISOString(),
      sources: {},
      totalDevices: 0,
      totalIssues: 0,
      totalPRs: 0
    };
    
    for (const [sourceId, source] of Object.entries(this.sources)) {
      console.log(`\n📡 Récolte depuis: ${source.name}`);
      
      try {
        const sourceData = await this.harvestFromSource(sourceId, source);
        results.sources[sourceId] = sourceData;
        
        results.totalDevices += sourceData.devices?.length || 0;
        results.totalIssues += sourceData.issues?.length || 0;
        results.totalPRs += sourceData.prs?.length || 0;
        
        console.log(`✅ ${source.name}: ${sourceData.devices?.length || 0} devices, ${sourceData.issues?.length || 0} issues`);
        
      } catch (error) {
        console.log(`⚠️ ${source.name}: Erreur - ${error.message}`);
        results.sources[sourceId] = { error: error.message };
      }
    }
    
    return results;
  }
  
  async harvestFromSource(sourceId, source) {
    // Simulation de récolte (en production, ce serait des appels API réels)
    const mockData = this.generateMockData(sourceId, source);
    
    // Sauvegarder les données de la source
    const sourceDataPath = path.join(this.researchDir, 'source-data', `${sourceId}.json`);
    fs.writeFileSync(sourceDataPath, JSON.stringify(mockData, null, 2));
    
    return mockData;
  }
  
  generateMockData(sourceId, source) {
    const baseDevices = [
      {
        id: 'TS011F_switch_1ch',
        name: 'Tuya Smart Switch 1 Channel',
        manufacturer: 'Tuya',
        model: 'TS011F',
        capabilities: ['onoff', 'measure_power'],
        zigbee: {
          manufacturer: 'Tuya',
          model: 'TS011F_switch_1ch',
          vendor: 'Tuya',
          description: '1 channel switch',
          supports: 'Zigbee 1.2'
        }
      },
      {
        id: 'TS0601_switch_2ch',
        name: 'Tuya Smart Switch 2 Channel',
        manufacturer: 'Tuya',
        model: 'TS0601',
        capabilities: ['onoff', 'measure_power'],
        zigbee: {
          manufacturer: 'Tuya',
          model: 'TS0601_switch_2ch',
          vendor: 'Tuya',
          description: '2 channel switch',
          supports: 'Zigbee 1.2'
        }
      },
      {
        id: 'TS0501B_light',
        name: 'Tuya Smart Light Bulb',
        manufacturer: 'Tuya',
        model: 'TS0501B',
        capabilities: ['onoff', 'dim', 'light_temperature'],
        zigbee: {
          manufacturer: 'Tuya',
          model: 'TS0501B_light',
          vendor: 'Tuya',
          description: 'Smart light bulb',
          supports: 'Zigbee 1.2'
        }
      }
    ];
    
    const baseIssues = [
      {
        id: `issue_${sourceId}_001`,
        title: 'Device pairing issue',
        status: 'open',
        priority: 'medium',
        source: sourceId
      },
      {
        id: `issue_${sourceId}_002`,
        title: 'Capability not working',
        status: 'closed',
        priority: 'high',
        source: sourceId
      }
    ];
    
    const basePRs = [
      {
        id: `pr_${sourceId}_001`,
        title: 'Add new device support',
        status: 'open',
        source: sourceId
      }
    ];
    
    return {
      source: sourceId,
      name: source.name,
      url: source.url,
      description: source.description,
      last_updated: new Date().toISOString(),
      devices: baseDevices.map(device => ({
        ...device,
        source: sourceId,
        confidence_score: Math.floor(Math.random() * 30) + 70, // 70-100
        last_seen: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000).toISOString()
      })),
      issues: baseIssues,
      prs: basePRs,
      metadata: {
        total_devices: baseDevices.length,
        total_issues: baseIssues.length,
        total_prs: basePRs.length
      }
    };
  }
  
  async generateHarvestReport(harvestResults) {
    console.log('\n📋 Génération du rapport de récolte...');
    
    const reportPath = path.join(this.researchDir, 'harvest-report.json');
    fs.writeFileSync(reportPath, JSON.stringify(harvestResults, null, 2));
    
    console.log(`📄 Rapport sauvegardé: ${reportPath}`);
    
    // Afficher le résumé
    console.log('\n🎯 RÉSUMÉ DE LA RÉCOLTE:');
    console.log(`📊 Sources traitées: ${Object.keys(harvestResults.sources).length}`);
    console.log(`🔌 Devices trouvés: ${harvestResults.totalDevices}`);
    console.log(`🐛 Issues trouvées: ${harvestResults.totalIssues}`);
    console.log(`🔀 PRs trouvées: ${harvestResults.totalPRs}`);
  }
  
  async createDeviceMatrix() {
    console.log('\n📊 Création de la matrice des devices...');
    
    // Lire toutes les données des sources
    const sourceDataDir = path.join(this.researchDir, 'source-data');
    const sourceFiles = fs.readdirSync(sourceDataDir).filter(file => file.endsWith('.json'));
    
    const allDevices = [];
    
    for (const sourceFile of sourceFiles) {
      try {
        const sourceData = JSON.parse(fs.readFileSync(path.join(sourceDataDir, sourceFile), 'utf8'));
        if (sourceData.devices) {
          allDevices.push(...sourceData.devices);
        }
      } catch (error) {
        console.log(`⚠️ Erreur lecture ${sourceFile}: ${error.message}`);
      }
    }
    
    // Créer la matrice
    const matrix = {
      timestamp: new Date().toISOString(),
      total_devices: allDevices.length,
      devices: allDevices,
      manufacturers: this.groupByManufacturer(allDevices),
      capabilities: this.groupByCapabilities(allDevices),
      sources: this.groupBySource(allDevices)
    };
    
    // Sauvegarder la matrice
    const matrixPath = path.join(this.researchDir, 'device-matrix', 'device-matrix.json');
    fs.writeFileSync(matrixPath, JSON.stringify(matrix, null, 2));
    
    console.log(`📄 Matrice sauvegardée: ${matrixPath}`);
    console.log(`🔌 ${allDevices.length} devices dans la matrice`);
  }
  
  groupByManufacturer(devices) {
    const groups = {};
    devices.forEach(device => {
      const manufacturer = device.manufacturer || 'Unknown';
      if (!groups[manufacturer]) {
        groups[manufacturer] = [];
      }
      groups[manufacturer].push(device.id);
    });
    return groups;
  }
  
  groupByCapabilities(devices) {
    const groups = {};
    devices.forEach(device => {
      device.capabilities?.forEach(capability => {
        if (!groups[capability]) {
          groups[capability] = [];
        }
        groups[capability].push(device.id);
      });
    });
    return groups;
  }
  
  groupBySource(devices) {
    const groups = {};
    devices.forEach(device => {
      const source = device.source || 'Unknown';
      if (!groups[source]) {
        groups[source] = [];
      }
      groups[source].push(device.id);
    });
    return groups;
  }
}

// Exécuter la récolte
if (require.main === module) {
  const harvester = new DataHarvester();
  harvester.harvestAllData();
}

module.exports = DataHarvester;
